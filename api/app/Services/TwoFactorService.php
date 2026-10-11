<?php

namespace App\Services;

use App\Models\User;
use App\Support\Totp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Two-factor authentication (authenticator-app codes plus one-time recovery codes).
 *
 * Setup is two steps so a person can't lock themselves out by scanning nothing: a
 * secret is stored unconfirmed, and 2FA only counts as on once they have typed a
 * valid code from the app.
 */
class TwoFactorService
{
    /** Starts (or restarts) setup and returns the new, not-yet-active secret. */
    public function beginSetup(User $user): string
    {
        $secret = Totp::generateSecret();

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_last_step' => null,
        ])->save();

        return $secret;
    }

    public function otpauthUri(User $user, string $secret): string
    {
        return Totp::uri((string) config('security.two_factor_issuer'), $user->email, $secret);
    }

    /**
     * Activates 2FA if the code from the app is right.
     *
     * @return string[]|null the recovery codes (shown to the person once), or null if the code was wrong
     */
    public function confirm(User $user, string $code): ?array
    {
        if ($user->two_factor_secret === null || $user->two_factor_confirmed_at !== null) {
            return null;
        }

        $step = Totp::verify($user->two_factor_secret, $code);

        if ($step === null) {
            return null;
        }

        $user->forceFill(['two_factor_confirmed_at' => now(), 'two_factor_last_step' => $step])->save();

        return $this->regenerateRecoveryCodes($user);
    }

    /** Checks an app code for someone who has 2FA on. Each code works once. */
    public function verifyCode(User $user, string $code): bool
    {
        if (! $user->hasTwoFactorEnabled()) {
            return false;
        }

        $step = Totp::verify($user->two_factor_secret, $code, $user->two_factor_last_step);

        if ($step === null) {
            return false;
        }

        $user->forceFill(['two_factor_last_step' => $step])->save();

        return true;
    }

    /** Uses up one recovery code. */
    public function useRecoveryCode(User $user, string $code): bool
    {
        $hash = $this->hashRecoveryCode($code);
        $codes = $user->two_factor_recovery_codes ?? [];
        $index = array_search($hash, $codes, true);

        if (! $user->hasTwoFactorEnabled() || $index === false) {
            return false;
        }

        unset($codes[$index]);
        $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

        return true;
    }

    /** @return string[] the new codes, in plain text, to show once */
    public function regenerateRecoveryCodes(User $user): array
    {
        $codes = collect(range(1, (int) config('security.recovery_code_count')))
            ->map(fn () => Str::lower(Str::random(5).'-'.Str::random(5)))
            ->all();

        $user->forceFill(['two_factor_recovery_codes' => array_map(fn (string $c) => $this->hashRecoveryCode($c), $codes)])->save();

        return $codes;
    }

    public function remainingRecoveryCodes(User $user): int
    {
        return count($user->two_factor_recovery_codes ?? []);
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_last_step' => null,
        ])->save();
    }

    /** A short-lived, single-use token that proves the password step of a sign-in is done. */
    public function issueChallenge(User $user, ?string $deviceName): string
    {
        $token = Str::random(60);

        Cache::put($this->challengeKey($token), ['user_id' => $user->id, 'device_name' => $deviceName], now()->addMinutes((int) config('security.two_factor_challenge_minutes')));

        return $token;
    }

    /** @return array{user_id: int, device_name: ?string}|null */
    public function peekChallenge(string $token): ?array
    {
        return Cache::get($this->challengeKey($token));
    }

    public function consumeChallenge(string $token): void
    {
        Cache::forget($this->challengeKey($token));
    }

    private function challengeKey(string $token): string
    {
        return 'two-factor-challenge:'.hash('sha256', $token);
    }

    /** Keyed hash: fast enough for 8 codes, and useless without the app key if the table leaks. */
    private function hashRecoveryCode(string $code): string
    {
        return hash_hmac('sha256', Str::lower(preg_replace('/\s+/', '', $code)), (string) config('app.key'));
    }
}
