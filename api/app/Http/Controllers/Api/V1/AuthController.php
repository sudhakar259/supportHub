<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\Customer;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\LoginSecurity;
use App\Services\TwoFactorService;
use App\Support\TenantContext;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * @group Authentication
 *
 * Token-based authentication shared by the web, mobile and third-party
 * clients. All endpoints here are unauthenticated except /auth/logout,
 * /auth/me and the email verification resend endpoint, which require a
 * Bearer token obtained from /auth/login or /auth/register.
 */
class AuthController extends Controller
{
    /**
     * Register (customer self-service)
     *
     * Creates a new Customer-role account and an associated customer
     * profile, then returns a Bearer token. A verification email is
     * queued automatically.
     *
     * @unauthenticated
     *
     * @bodyParam tenant string required The organization's slug, confirmable via GET /tenants/lookup/{slug}. Example: acme-support
     * @bodyParam name string required The user's full name. Example: Jamie Rivera
     * @bodyParam email string required Unique within this tenant (the same email may register with a different tenant separately). Example: jamie@example.com
     * @bodyParam password string required Minimum 10 characters, including upper and lower case, a number, and a symbol. Example: Secret123!word$9
     * @bodyParam password_confirmation string required Must match password. Example: Secret123!
     * @bodyParam phone string The user's phone number. Example: +1-555-0100
     * @bodyParam company_name string Optional company name for business customers. Example: Acme Corp
     *
     * @response 201 {
     *   "success": true,
     *   "message": "Registration successful.",
     *   "data": {
     *     "user": {"id": 42, "name": "Jamie Rivera", "email": "jamie@example.com", "roles": ["Customer"]},
     *     "token": "1|abcdef123456...",
     *     "token_type": "Bearer"
     *   }
     * }
     * @response 422 {
     *   "success": false,
     *   "message": "Validation failed.",
     *   "errors": {"email": ["The email has already been taken."]}
     * }
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $tenant = Tenant::where('slug', $request->string('tenant'))->firstOrFail();

        $user = app(TenantContext::class)->runAs($tenant, function () use ($request, $tenant) {
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'phone' => $request->filled('phone') ? $request->string('phone')->toString() : null,
                'password' => Hash::make($request->string('password')),
                'is_active' => true,
            ]);

            $user->assignRole('Customer');

            Customer::create([
                'user_id' => $user->id,
                'company_name' => $request->filled('company_name') ? $request->string('company_name')->toString() : null,
                'customer_type' => $request->filled('company_name') ? 'business' : 'individual',
            ]);

            return $user;
        });

        event(new Registered($user));

        $token = $user->createToken($request->string('device_name')->toString() ?: 'api')->plainTextToken;

        return $this->created([
            'user' => new UserResource($user->load(['customer', 'tenant'])),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Registration successful.');
    }

    /**
     * Login
     *
     * Exchanges email/password credentials for a Sanctum Bearer token.
     * Pass a `device_name` so multiple tokens (web, iOS, Android) can be
     * managed and revoked independently per device.
     *
     * @unauthenticated
     *
     * @bodyParam email string required Example: admin@supporthub.test
     * @bodyParam password string required Example: password
     * @bodyParam tenant string Disambiguates if this email has accounts with more than one tenant. Example: acme-support
     * @bodyParam device_name string Identifies the issued token, e.g. "iphone-15". Example: web-browser
     *
     * @response 200 {
     *   "success": true,
     *   "message": "Login successful.",
     *   "data": {
     *     "user": {"id": 1, "name": "System Administrator", "email": "admin@supporthub.test", "roles": ["Administrator"]},
     *     "token": "1|abcdef123456...",
     *     "token_type": "Bearer"
     *   }
     * }
     * @response 422 {
     *   "success": false,
     *   "message": "Validation failed.",
     *   "errors": {"email": ["The provided credentials are incorrect."]}
     * }
     * @response 403 {
     *   "success": false,
     *   "message": "This account has been deactivated."
     * }
     * @response 423 {
     *   "success": false,
     *   "message": "Too many failed sign-in attempts. This account is locked for another 15 minutes.",
     *   "retry_after_seconds": 900
     * }
     */
    public function login(LoginRequest $request, LoginSecurity $security, TwoFactorService $twoFactor): JsonResponse
    {
        $candidates = User::withoutTenantScope()->where('email', $request->string('email'));

        if ($request->filled('tenant')) {
            $tenant = Tenant::where('slug', $request->string('tenant'))->first();
            $candidates->where('tenant_id', $tenant?->id);
        }

        $candidates = $candidates->get();

        // A locked account is refused before the password is even looked at, so a
        // correct guess made during the lock tells an attacker nothing.
        if ($candidates->count() === 1 && $candidates->first()->isLocked()) {
            return $this->locked($candidates->first(), $security);
        }

        // Plural on purpose: the same email may have an account with
        // several tenants (and/or a platform-admin account) — password
        // hashes differ per account, so the one that actually matches
        // this password is unambiguous even without a `tenant` hint,
        // except in the vanishingly unlikely case two of them happen to
        // share the exact same password too, which `tenant` resolves.
        $user = $candidates->first(
            fn (User $candidate) => Hash::check($request->string('password'), $candidate->password)
        );

        if (! $user) {
            // Count the miss against every account that could have been meant.
            $candidates->reject(fn (User $candidate) => $candidate->isLocked())->each(fn (User $candidate) => $security->recordFailure($candidate));

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->isLocked()) {
            return $this->locked($user, $security);
        }

        if (! $user->is_active) {
            return $this->error('This account has been deactivated.', 403);
        }

        if ($user->tenant && ! $user->tenant->isActive()) {
            return $this->error('This tenant account is suspended or no longer active.', 403);
        }

        // Password is right, but this account also needs its authenticator code: no
        // token yet, just a short-lived proof that the first step passed.
        if ($user->hasTwoFactorEnabled()) {
            return $this->success([
                'two_factor_required' => true,
                'challenge_token' => $twoFactor->issueChallenge($user, $request->string('device_name')->toString() ?: null),
            ], 'Two-factor authentication required.');
        }

        return $this->completeLogin($user, $request->string('device_name')->toString() ?: 'api', $security);
    }

    /**
     * Complete a two-factor sign-in
     *
     * Second step of `/auth/login` for an account that has two-factor authentication
     * on. Send the `challenge_token` from the login response plus either the 6-digit
     * code from the authenticator app (`code`) or one unused recovery code
     * (`recovery_code`). Wrong codes count toward the same lockout as wrong passwords.
     *
     * @unauthenticated
     *
     * @bodyParam challenge_token string required From the login response. Example: Zk3...
     * @bodyParam code string The 6-digit code. Example: 123456
     * @bodyParam recovery_code string One of the recovery codes, instead of `code`. Example: ab12c-d34ef
     *
     * @response 200 {"success": true, "message": "Login successful.", "data": {"user": {"id": 1}, "token": "1|abc...", "token_type": "Bearer"}}
     * @response 422 {"success": false, "message": "Validation failed.", "errors": {"code": ["The code is incorrect or has expired."]}}
     * @response 423 {"success": false, "message": "Too many failed sign-in attempts. This account is locked for another 15 minutes."}
     */
    public function twoFactorChallenge(Request $request, LoginSecurity $security, TwoFactorService $twoFactor): JsonResponse
    {
        $data = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['nullable', 'string', 'max:20', 'required_without:recovery_code'],
            'recovery_code' => ['nullable', 'string', 'max:30', 'required_without:code'],
        ]);

        $challenge = $twoFactor->peekChallenge($data['challenge_token']);
        $user = $challenge ? User::withoutTenantScope()->find($challenge['user_id']) : null;

        if (! $user || ! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => ['This sign-in has expired. Please sign in again.']]);
        }

        \App\Support\WorkspaceDomains::assertUserMatches($request, $user);

        if ($user->isLocked()) {
            return $this->locked($user, $security);
        }

        $ok = filled($data['code'] ?? null)
            ? $twoFactor->verifyCode($user, $data['code'])
            : $twoFactor->useRecoveryCode($user, (string) $data['recovery_code']);

        if (! $ok) {
            if ($security->recordFailure($user)) {
                $twoFactor->consumeChallenge($data['challenge_token']);

                return $this->locked($user->refresh(), $security);
            }

            throw ValidationException::withMessages([
                filled($data['code'] ?? null) ? 'code' : 'recovery_code' => ['The code is incorrect or has expired.'],
            ]);
        }

        $twoFactor->consumeChallenge($data['challenge_token']);

        return $this->completeLogin($user, $challenge['device_name'] ?: 'api', $security);
    }

    private function locked(User $user, LoginSecurity $security): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $security->lockedMessage($user),
            'retry_after_seconds' => max(0, (int) now()->diffInSeconds($user->locked_until, false)),
        ], 423);
    }

    /** Everything that happens once someone has fully proved who they are. */
    private function completeLogin(User $user, string $deviceName, LoginSecurity $security): JsonResponse
    {
        $security->clear($user);

        $user->forceFill(['last_login_at' => now()])->save();

        // /auth/login runs with no 'tenant.context' middleware (the
        // tenant isn't known until a credential matches), so nothing else
        // sets TenantContext for this request — do it explicitly, using
        // the tenant the matched user actually belongs to (null for a
        // platform admin). This also syncs spatie/laravel-permission's
        // team id (see TenantContext::set()), which the roles/permissions
        // load below and AuditLog's BelongsToTenant both depend on; unlike
        // runAs(), this intentionally stays set for the rest of the
        // request instead of restoring to "no tenant" afterward, since
        // that restore is exactly what left the pre-fix response's
        // roles/permissions empty for every non-platform-admin user.
        app(TenantContext::class)->set($user->tenant);

        app(AuditLogger::class)->log('auth.login', $user, null, null, $user);

        $token = $user->createToken($deviceName)->plainTextToken;

        return $this->success([
            'user' => new UserResource($user->load(['roles', 'customer', 'departments'])),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful.');
    }

    /**
     * Logout
     *
     * Revokes the Bearer token used to make this request. Other tokens
     * issued to the same user (other devices) remain valid.
     *
     * @response 200 {"success": true, "message": "Logged out successfully.", "data": null}
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out successfully.');
    }

    /**
     * Current user
     *
     * Returns the authenticated user's profile, roles, permissions and
     * (for customers) their customer profile.
     *
     * @response 200 {
     *   "success": true,
     *   "message": "Request successful.",
     *   "data": {"id": 1, "name": "System Administrator", "email": "admin@supporthub.test", "roles": ["Administrator"], "permissions": ["tickets.view", "..."]}
     * }
     */
    public function me(Request $request): JsonResponse
    {
        $authUser = $request->user();

        if (! $authUser->is_active) {
            return $this->error('This account has been deactivated.', 401);
        }

        // No 'tenant.context' middleware runs on this route, so nothing
        // else sets TenantContext — without it, spatie/laravel-permission's
        // team id stays at its own unset default, which matches no role
        // row for any user (not even a platform admin's), and roles/
        // permissions below would come back empty regardless of who's
        // asking. See the matching fix in login() for the full story.
        app(TenantContext::class)->set($authUser->tenant);

        $user = $authUser->load(['roles', 'customer', 'departments']);

        return $this->success(new UserResource($user));
    }

    /**
     * Forgot password
     *
     * Sends a password reset link to the given email if an account
     * exists for it. Always returns the same generic success message
     * regardless of whether the email is registered, to avoid leaking
     * which addresses have accounts.
     *
     * @unauthenticated
     *
     * @bodyParam email string required Example: admin@supporthub.test
     * @bodyParam tenant string Disambiguates if this email has accounts with more than one tenant — strongly recommended whenever it might, since omitting it resolves to whichever account matches first. Example: acme-support
     *
     * @response 200 {
     *   "success": true,
     *   "message": "If an account exists for that email, a password reset link has been sent.",
     *   "data": null
     * }
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($this->passwordResetCredentials($request));

        return $this->success(null, 'If an account exists for that email, a password reset link has been sent.');
    }

    /**
     * Reset password
     *
     * Completes a password reset using the token emailed by
     * /auth/forgot-password.
     *
     * @unauthenticated
     *
     * @bodyParam token string required The token from the reset email. Example: 9f8e7d6c5b4a
     * @bodyParam email string required Example: admin@supporthub.test
     * @bodyParam tenant string Same disambiguator as /auth/forgot-password — pass it if it was used there. Example: acme-support
     * @bodyParam password string required Minimum 10 characters, including upper and lower case, a number, and a symbol. Example: NewSecret123!word$9
     * @bodyParam password_confirmation string required Must match password. Example: NewSecret123!
     *
     * @response 200 {"success": true, "message": "Password has been reset successfully.", "data": null}
     * @response 422 {
     *   "success": false,
     *   "message": "Validation failed.",
     *   "errors": {"email": ["This password reset token is invalid or has expired."]}
     * }
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $credentials = $this->passwordResetCredentials($request)
            + $request->only('password', 'password_confirmation', 'token');

        $status = Password::reset(
            $credentials,
            function (User $user, string $password) {
                // Completing the emailed link proves control of the mailbox, which is what
                // email verification is for; accounts created by staff rely on this path.
                $user->forceFill([
                    'password' => Hash::make($password),
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                ])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['This password reset token is invalid or has expired.'],
            ]);
        }

        return $this->success(null, 'Password has been reset successfully.');
    }

    /**
     * Credentials for Laravel's password broker — email, plus
     * tenant_id when a `tenant` slug was given. EloquentUserProvider
     * adds every non-password credential key as an extra WHERE clause
     * (see retrieveByCredentials()), so including tenant_id here
     * resolves the SAME email to the correct tenant's account instead
     * of ambiguously matching whichever one happens to come back
     * first — the same email may be a different account per tenant,
     * and without this, one tenant's reset request could, in the rare
     * case of a shared email, end up validating against (and
     * resetting the password of) a DIFFERENT tenant's account.
     *
     * @return array<string, mixed>
     */
    private function passwordResetCredentials(Request $request): array
    {
        $credentials = $request->only('email');

        if ($request->filled('tenant')) {
            $credentials['tenant_id'] = Tenant::where('slug', $request->string('tenant'))->value('id');
        }

        return $credentials;
    }

    /**
     * Resend email verification
     *
     * Resends the verification email if the authenticated user's address
     * is not yet verified.
     *
     * @response 200 {"success": true, "message": "Verification link sent.", "data": null}
     * @response 200 {"success": true, "message": "Email already verified.", "data": null}
     */
    public function resendVerification(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return $this->success(null, 'Email already verified.');
        }

        $request->user()->sendEmailVerificationNotification();

        return $this->success(null, 'Verification link sent.');
    }

    /**
     * Verify email
     *
     * Consumes the signed link from the verification email. `id` and
     * `hash` come from that link and are not meant to be constructed
     * by hand.
     *
     * @unauthenticated
     *
     * @urlParam id integer required The user id from the verification link. Example: 1
     * @urlParam hash string required The sha1 hash of the user's email from the verification link. Example: 5f4dcc3b5aa765d61d8327deb882cf99
     *
     * @response 200 {"success": true, "message": "Email verified successfully.", "data": null}
     * @response 403 {"success": false, "message": "Invalid verification link."}
     */
    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return $this->error('Invalid verification link.', 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return $this->success(null, 'Email verified successfully.');
    }
}
