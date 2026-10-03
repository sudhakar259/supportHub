<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Webhook URLs are POSTed to by DeliverWebhookJob with no further
 * review — an unchecked tenant-supplied URL is a direct SSRF vector
 * onto this app's own internal network (metadata endpoints, internal
 * services, localhost admin panels, ...). Rejects loopback, private,
 * link-local and reserved ranges, and refuses to even attempt the
 * check on a hostname that won't resolve, rather than letting it
 * through.
 */
class NotAPrivateUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $url = parse_url((string) $value);

        if (! $url || ! in_array($url['scheme'] ?? null, ['http', 'https'], true) || empty($url['host'])) {
            $fail('The :attribute must be a valid http or https URL.');

            return;
        }

        $host = $url['host'];

        if (strcasecmp($host, 'localhost') === 0) {
            $fail('The :attribute may not point to a local or private address.');

            return;
        }

        $ips = filter_var($host, FILTER_VALIDATE_IP)
            ? [$host]
            : (gethostbynamel($host) ?: []);

        if (empty($ips)) {
            $fail('The :attribute host could not be resolved.');

            return;
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                $fail('The :attribute may not point to a local or private address.');

                return;
            }
        }
    }
}
