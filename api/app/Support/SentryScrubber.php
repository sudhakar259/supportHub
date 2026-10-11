<?php

namespace App\Support;

use Sentry\Event;
use Sentry\EventHint;

/**
 * Runs on every error before it leaves the server for Sentry (config/sentry.php `before_send`).
 *
 * An error report must say where something broke, not carry the people or secrets involved. Sentry's own
 * defaults already leave out cookies, the client IP and SQL values; this goes further for things that are
 * specific to this product: API keys and secrets, bearer tokens, password-reset links, customers' email
 * addresses (which database errors paste into their messages), and ticket text that may sit in a request body.
 */
class SentryScrubber
{
    /** Headers that carry credentials. Matched case-insensitively. */
    private const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-xsrf-token', 'x-csrf-token', 'x-api-key', 'x-api-secret', 'x-webhook-signature'];

    public static function beforeSend(Event $event, ?EventHint $hint = null): ?Event
    {
        if ($request = $event->getRequest()) {
            $request['headers'] = array_filter(
                (array) ($request['headers'] ?? []),
                fn ($value, $name) => ! in_array(strtolower((string) $name), self::SENSITIVE_HEADERS, true),
                ARRAY_FILTER_USE_BOTH,
            );
            unset($request['cookies'], $request['data'], $request['query_string']);

            // The path says which endpoint failed; the query string can hold reset tokens and emails.
            if (isset($request['url'])) {
                $request['url'] = strtok((string) $request['url'], '?#');
            }

            $event->setRequest($request);
        }

        foreach ($event->getExceptions() as $exception) {
            $exception->setValue(self::redact($exception->getValue()));
        }

        if ($message = $event->getMessage()) {
            $event->setMessage(self::redact($message));
        }

        return $event;
    }

    /** Replaces email addresses, tokens and keys inside free text. */
    public static function redact(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        $patterns = [
            '/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/' => '[email]',           // customers' and staff addresses
            '/\b\d+\|[A-Za-z0-9]{30,}\b/' => '[token]',                                    // Sanctum API tokens: 12|abc…
            '/\bBearer\s+[A-Za-z0-9._\-]{16,}/i' => 'Bearer [token]',
            '/\b(ak|as|whsec|rzp_live|rzp_test)_[A-Za-z0-9]{10,}\b/' => '[secret]',        // API keys/secrets, webhook secrets, Razorpay
            '/([?&](?:token|signature|code|password)=)[^&\s"\']+/i' => '$1[redacted]',     // reset/verify links
            '/base64:[A-Za-z0-9+\/=]{20,}/' => 'base64:[redacted]',                        // APP_KEY style values
        ];

        return preg_replace(array_keys($patterns), array_values($patterns), $text) ?? $text;
    }
}
