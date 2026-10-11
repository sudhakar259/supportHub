<?php

namespace App\Services\InboundEmail;

use App\Models\SystemSetting;
use App\Models\Tenant;

/**
 * A workspace's email-to-ticket address and switches. Stored as the tenant's own
 * rows in system_settings (same table as its other email settings).
 */
class InboundEmailSettings
{
    public const ENABLED = 'inbound_email.enabled';

    public const CREATE_CUSTOMERS = 'inbound_email.create_customers';

    public static function domain(): ?string
    {
        $domain = strtolower(trim((string) config('inbound_email.domain')));

        return $domain !== '' ? $domain : null;
    }

    public static function address(Tenant $tenant): ?string
    {
        $domain = self::domain();

        return $domain ? "{$tenant->slug}@{$domain}" : null;
    }

    /** The workspace whose address was written to, or null for anything else. */
    public static function tenantForRecipient(string $recipient): ?Tenant
    {
        $domain = self::domain();
        $recipient = strtolower(trim($recipient));

        if (! $domain || ! str_ends_with($recipient, '@'.$domain)) {
            return null;
        }

        return Tenant::where('slug', substr($recipient, 0, -strlen('@'.$domain)))->first();
    }

    public static function enabled(Tenant $tenant): bool
    {
        return self::bool($tenant, self::ENABLED, false);
    }

    /** Whether an email from an unknown sender may create a new customer (default: yes). */
    public static function createsCustomers(Tenant $tenant): bool
    {
        return self::bool($tenant, self::CREATE_CUSTOMERS, true);
    }

    public static function save(Tenant $tenant, bool $enabled, bool $createCustomers): void
    {
        foreach ([self::ENABLED => $enabled, self::CREATE_CUSTOMERS => $createCustomers] as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key, 'tenant_id' => $tenant->id],
                ['value' => $value ? 'true' : 'false', 'type' => 'boolean', 'group' => 'email', 'is_public' => false]
            );
        }
    }

    private static function bool(Tenant $tenant, string $key, bool $default): bool
    {
        $value = SystemSetting::withoutTenantScope()->where('tenant_id', $tenant->id)->where('key', $key)->value('value');

        return $value === null ? $default : filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
