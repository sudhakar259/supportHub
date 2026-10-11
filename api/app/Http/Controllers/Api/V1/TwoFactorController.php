<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Services\LoginSecurity;
use App\Services\TwoFactorService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * @group Two-factor authentication
 *
 * Lets a signed-in person protect their own account with an authenticator app
 * (Google Authenticator, Microsoft Authenticator, 1Password, Authy…). Every step
 * asks for the current password again, so a stolen session token alone can't
 * switch protection on or off. Wrong passwords and wrong codes here count toward
 * the same lockout as at sign-in.
 */
class TwoFactorController extends Controller
{
    public function __construct(private TwoFactorService $twoFactor, private LoginSecurity $security, private AuditLogger $audit) {}

    /**
     * Start two-factor setup
     *
     * Returns a new secret and the `otpauth://` link to show as a QR code. Two-factor is
     * not active yet: call `/auth/two-factor/confirm` with a code from the app first.
     *
     * @bodyParam password string required The current password. Example: Secret123!word
     *
     * @response 200 {"success": true, "message": "Scan the code, then confirm with a code from your app.", "data": {"secret": "JBSWY3DPEHPK3PXP", "otpauth_url": "otpauth://totp/SupportHub:me%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=SupportHub"}}
     * @response 422 {"success": false, "message": "Two-factor authentication is already on. Turn it off first to set it up again."}
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $this->actor($request);
        $this->confirmPassword($request, $user);

        if ($user->hasTwoFactorEnabled()) {
            return $this->error('Two-factor authentication is already on. Turn it off first to set it up again.', 422);
        }

        $secret = $this->twoFactor->beginSetup($user);

        return $this->success([
            'secret' => $secret,
            'otpauth_url' => $this->twoFactor->otpauthUri($user, $secret),
        ], 'Scan the code, then confirm with a code from your app.');
    }

    /**
     * Turn two-factor on
     *
     * Confirms setup with the first 6-digit code from the app. Returns the recovery
     * codes **once**; each works a single time if the phone is lost.
     *
     * @bodyParam code string required Example: 123456
     *
     * @response 200 {"success": true, "message": "Two-factor authentication is on.", "data": {"recovery_codes": ["ab12c-d34ef", "gh56i-j78kl"]}}
     * @response 422 {"success": false, "message": "Validation failed.", "errors": {"code": ["The code is incorrect or has expired."]}}
     */
    public function confirm(Request $request): JsonResponse
    {
        $user = $this->actor($request);
        $data = $request->validate(['code' => ['required', 'string', 'max:20']]);

        $codes = $this->twoFactor->confirm($user, $data['code']);

        if ($codes === null) {
            $this->failed($user, 'code');
        }

        $this->audit->log('auth.two_factor_enabled', $user, null, null, $user);

        return $this->success(['recovery_codes' => $codes], 'Two-factor authentication is on.');
    }

    /**
     * Turn two-factor off
     *
     * @bodyParam password string required The current password. Example: Secret123!word
     * @bodyParam code string A current 6-digit code. Example: 123456
     * @bodyParam recovery_code string A recovery code, instead of `code`. Example: ab12c-d34ef
     *
     * @response 200 {"success": true, "message": "Two-factor authentication is off.", "data": null}
     */
    public function disable(Request $request): JsonResponse
    {
        $user = $this->actor($request);
        $this->confirmPassword($request, $user);
        $this->confirmSecondFactor($request, $user);

        $this->twoFactor->disable($user);
        $this->audit->log('auth.two_factor_disabled', $user, null, null, $user);

        return $this->success(null, 'Two-factor authentication is off.');
    }

    /**
     * Get new recovery codes
     *
     * Replaces all recovery codes. The old ones stop working.
     *
     * @bodyParam password string required The current password. Example: Secret123!word
     * @bodyParam code string required A current 6-digit code. Example: 123456
     *
     * @response 200 {"success": true, "message": "New recovery codes created. The old ones no longer work.", "data": {"recovery_codes": ["ab12c-d34ef"]}}
     */
    public function recoveryCodes(Request $request): JsonResponse
    {
        $user = $this->actor($request);
        $this->confirmPassword($request, $user);

        abort_unless($user->hasTwoFactorEnabled(), 422, 'Two-factor authentication is not on.');

        $request->validate(['code' => ['required', 'string', 'max:20']]);
        $this->confirmSecondFactor($request, $user);

        return $this->success(['recovery_codes' => $this->twoFactor->regenerateRecoveryCodes($user)], 'New recovery codes created. The old ones no longer work.');
    }

    private function actor(Request $request)
    {
        $user = $request->user();
        // These routes have no tenant.context middleware (platform admins use them too).
        app(TenantContext::class)->set($user->tenant);

        if ($user->isLocked()) {
            abort(423, $this->security->lockedMessage($user));
        }

        return $user;
    }

    private function confirmPassword(Request $request, $user): void
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->input('password'), $user->password)) {
            $this->failed($user, 'password', 'The password is incorrect.');
        }
    }

    private function confirmSecondFactor(Request $request, $user): void
    {
        $ok = $request->filled('code')
            ? $this->twoFactor->verifyCode($user, (string) $request->input('code'))
            : ($request->filled('recovery_code') && $this->twoFactor->useRecoveryCode($user, (string) $request->input('recovery_code')));

        if (! $ok) {
            $this->failed($user, $request->filled('recovery_code') && ! $request->filled('code') ? 'recovery_code' : 'code');
        }
    }

    /** Counts the miss toward lockout, then fails the request. */
    private function failed($user, string $field, string $message = 'The code is incorrect or has expired.'): never
    {
        if ($this->security->recordFailure($user)) {
            abort(423, $this->security->lockedMessage($user->refresh()));
        }

        throw ValidationException::withMessages([$field => [$message]]);
    }
}
