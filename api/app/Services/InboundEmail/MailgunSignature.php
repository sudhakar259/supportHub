<?php

namespace App\Services\InboundEmail;

use Illuminate\Support\Facades\Cache;

/**
 * Mailgun signs every webhook: signature = HMAC-SHA256(signing key, timestamp . token).
 * Rejects wrong signatures, stale timestamps and a token that was already used,
 * so a captured request cannot be replayed to create duplicate tickets.
 */
class MailgunSignature
{
    public function verify(?string $timestamp, ?string $token, ?string $signature): bool
    {
        $key = (string) config('inbound_email.mailgun_signing_key');

        if ($key === '' || ! $timestamp || ! $token || ! $signature) {
            return false;
        }

        if (! ctype_digit($timestamp) || abs(time() - (int) $timestamp) > (int) config('inbound_email.signature_max_age_seconds')) {
            return false;
        }

        if (! hash_equals(hash_hmac('sha256', $timestamp.$token, $key), $signature)) {
            return false;
        }

        // add() is false when the key exists: the token has been seen before.
        return Cache::add('mailgun-inbound-token:'.hash('sha256', $token), 1, now()->addMinutes(15));
    }
}
