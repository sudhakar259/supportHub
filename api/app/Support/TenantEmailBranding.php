<?php

namespace App\Support;

use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\Tenant;

/**
 * Sender name, reply-to and sign-off for mail sent on a tenant's behalf.
 * Only the tenant's own settings and record are read: the platform
 * defaults in SystemSettingSeeder are not tenant branding, so using them
 * would sign every tenant's mail as the platform.
 */
final class TenantEmailBranding
{
    private const PLATFORM_SENDER = 'DeskNu';

    /** Plans that only ever send from the platform address. */
    private const PLATFORM_ADDRESS_PLANS = ['starter'];

    /**
     * @return array{sender_name: string, from_address: ?string, reply_to: ?string, signature: string}
     */
    public static function forTenant(?Tenant $tenant): array
    {
        if ($tenant === null) {
            return [
                'sender_name' => self::PLATFORM_SENDER,
                'from_address' => null,
                'reply_to' => null,
                'signature' => 'Regards,'."\n".self::PLATFORM_SENDER,
            ];
        }

        $overrides = SystemSetting::withoutTenantScope()
            ->where('tenant_id', $tenant->id)
            ->whereIn('key', ['email.sender_name', 'email.reply_to', 'support_email', 'email.branding_signature', 'email.sending_domain', 'email.domain_verified'])
            ->pluck('value', 'key');

        $override = fn (string $key): ?string => filled($overrides[$key] ?? null) ? $overrides[$key] : null;

        return [
            'sender_name' => $override('email.sender_name') ?? $tenant->name,
            'from_address' => self::verifiedFromAddress($tenant, $override('email.sending_domain'), $override('email.domain_verified')),
            'reply_to' => $override('email.reply_to') ?? $override('support_email') ?? ($tenant->email ?: null),
            'signature' => $override('email.branding_signature') ?? 'Regards,'."\n".$tenant->name,
        ];
    }

    /**
     * The tenant's own From address, or null to send from the platform
     * address. Needs a plan above Starter plus a domain the platform has
     * marked verified (SPF/DKIM in place); sending from an unauthenticated
     * domain would land in spam and hurt the platform's sender reputation.
     */
    private static function verifiedFromAddress(Tenant $tenant, ?string $domain, ?string $verified): ?string
    {
        $domain = $domain !== null ? strtolower(trim($domain)) : null;

        if ($domain === null || ! filter_var($verified, FILTER_VALIDATE_BOOLEAN)) {
            return null;
        }

        $plan = Subscription::where('tenant_id', $tenant->id)->first()?->plan;

        if ($plan === null || in_array($plan->slug, self::PLATFORM_ADDRESS_PLANS, true)) {
            return null;
        }

        $address = 'support@'.$domain;

        return filter_var($address, FILTER_VALIDATE_EMAIL) ? $address : null;
    }
}
