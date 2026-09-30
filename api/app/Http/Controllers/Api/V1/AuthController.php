<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\Customer;
use App\Models\User;
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
     * @bodyParam name string required The user's full name. Example: Jamie Rivera
     * @bodyParam email string required A unique email address. Example: jamie@example.com
     * @bodyParam password string required Minimum 8 characters. Example: Secret123!
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
        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'phone' => $request->string('phone') ?: null,
            'password' => Hash::make($request->string('password')),
            'is_active' => true,
        ]);

        $user->assignRole('Customer');

        Customer::create([
            'user_id' => $user->id,
            'company_name' => $request->string('company_name') ?: null,
            'customer_type' => $request->filled('company_name') ? 'business' : 'individual',
        ]);

        event(new Registered($user));

        $token = $user->createToken($request->string('device_name')->toString() ?: 'api')->plainTextToken;

        return $this->created([
            'user' => new UserResource($user->load(['customer'])),
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
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            return $this->error('This account has been deactivated.', 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($request->string('device_name')->toString() ?: 'api')->plainTextToken;

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
        $user = $request->user()->load(['roles', 'customer', 'departments']);

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
     *
     * @response 200 {
     *   "success": true,
     *   "message": "If an account exists for that email, a password reset link has been sent.",
     *   "data": null
     * }
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

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
     * @bodyParam password string required Minimum 8 characters. Example: NewSecret123!
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
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
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
