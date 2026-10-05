<?php

namespace App\Support;

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
    private const PLATFORM_SENDER = 'SupportHub';

    /**
     * @return array{sender_name: string, reply_to: ?string, signature: string}
     */
    public static function forTenant(?Tenant $tenant): array
    {
        if ($tenant === null) {
            return [
                'sender_name' => self::PLATFORM_SENDER,
                'reply_to' => null,
                'signature' => 'Regards,'."\n".self::PLATFORM_SENDER,
            ];
        }

        $overrides = SystemSetting::withoutTenantScope()
            ->where('tenant_id', $tenant->id)
            ->whereIn('key', ['email.sender_name', 'email.reply_to', 'support_email', 'email.branding_signature'])
            ->pluck('value', 'key');

        $override = fn (string $key): ?string => filled($overrides[$key] ?? null) ? $overrides[$key] : null;

        return [
            'sender_name' => $override('email.sender_name') ?? $tenant->name,
            'reply_to' => $override('email.reply_to') ?? $override('support_email') ?? ($tenant->email ?: null),
            'signature' => $override('email.branding_signature') ?? 'Regards,'."\n".$tenant->name,
        ];
    }
}
