<?php

namespace App\Services;

use App\Models\User;
use App\Support\TenantContext;

/** Counts failed sign-ins per account and locks it after too many in a row. */
class LoginSecurity
{
    public function __construct(private AuditLogger $audit, private TenantContext $tenantContext) {}

    /** Records a wrong password or wrong two-factor code. Returns true if this one locked the account. */
    public function recordFailure(User $user): bool
    {
        $attempts = $user->failed_login_attempts + 1;

        if ($attempts < (int) config('security.lockout_max_attempts')) {
            $user->forceFill(['failed_login_attempts' => $attempts])->save();

            return false;
        }

        $lockedUntil = now()->addMinutes((int) config('security.lockout_minutes'));
        $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => $lockedUntil])->save();

        // Audit rows belong to a workspace, and a failed sign-in has no tenant context yet.
        $this->tenantContext->runAs($user->tenant, fn () => $this->audit->log(
            'auth.account_locked',
            $user,
            null,
            ['locked_until' => $lockedUntil->toIso8601String()],
        ));

        return true;
    }

    /** A successful sign-in, an administrator unlocking, or a password reset. */
    public function clear(User $user): void
    {
        if ($user->failed_login_attempts !== 0 || $user->locked_until !== null) {
            $user->forceFill(['failed_login_attempts' => 0, 'locked_until' => null])->save();
        }
    }

    public function lockedMessage(User $user): string
    {
        $minutes = max(1, (int) ceil(now()->diffInSeconds($user->locked_until, false) / 60));

        return "Too many failed sign-in attempts. This account is locked for another {$minutes} minute".($minutes === 1 ? '' : 's').'. You can wait, reset your password, or ask an administrator to unlock it.';
    }
}
