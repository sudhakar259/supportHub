<?php

namespace App\Support;

/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30-second steps) — the
 * format Google Authenticator, Microsoft Authenticator, 1Password and Authy all use.
 */
final class Totp
{
    public const STEP_SECONDS = 30;

    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** A fresh 160-bit secret, base32-encoded (32 characters). */
    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    public static function currentStep(?int $time = null): int
    {
        return intdiv($time ?? time(), self::STEP_SECONDS);
    }

    public static function code(string $secret, int $step, int $digits = 6): string
    {
        $hash = hash_hmac('sha1', pack('N2', 0, $step), self::base32Decode($secret), true);
        $offset = ord($hash[19]) & 0x0F;
        $binary = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($binary % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    /**
     * The 30-second step the code is valid for, or null. Accepts one step either side
     * of now (clock drift) and never a step at or before $lastStep, so a code that was
     * already used — or one older than the last used — cannot be replayed.
     */
    public static function verify(string $secret, string $code, ?int $lastStep = null, ?int $time = null): ?int
    {
        $code = preg_replace('/\s+/', '', $code);

        if (! preg_match('/^\d{6}$/', (string) $code)) {
            return null;
        }

        $now = self::currentStep($time);

        foreach ([$now, $now - 1, $now + 1] as $step) {
            if ($lastStep !== null && $step <= $lastStep) {
                continue;
            }

            if (hash_equals(self::code($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /** The otpauth:// link an authenticator app reads from a QR code. */
    public static function uri(string $issuer, string $account, string $secret): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=%d',
            rawurlencode($issuer),
            rawurlencode($account),
            $secret,
            rawurlencode($issuer),
            self::STEP_SECONDS,
        );
    }

    public static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    public static function base32Decode(string $encoded): string
    {
        $bits = '';
        foreach (str_split(strtoupper(rtrim($encoded, '='))) as $char) {
            $value = strpos(self::ALPHABET, $char);
            if ($value === false) {
                continue;
            }
            $bits .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
