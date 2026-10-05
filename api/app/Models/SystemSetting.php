<?php

namespace App\Models;

use App\Models\Concerns\HasTenantOverride;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

#[Fillable(['tenant_id', 'key', 'value', 'type', 'group', 'is_public'])]
class SystemSetting extends Model
{
    use HasTenantOverride;

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn (self $setting) => Cache::forget(self::cacheKey($setting->tenant_id)));
        static::deleted(fn (self $setting) => Cache::forget(self::cacheKey($setting->tenant_id)));
    }

    public function castValue(): mixed
    {
        return match ($this->type) {
            'integer' => (int) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }

    /**
     * A tenant's own override wins over the platform default for the
     * same key — both are in scope (HasTenantOverride) but this picks
     * the more specific row when both exist.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $tenantId = app(TenantContext::class)->id();

        // Ascending puts the platform default (tenant_id null) first and
        // the tenant's own override last; keyBy() keeps the LAST row per
        // key, so the override correctly wins when both exist.
        // Cache plain arrays, never model objects: the database cache store
        // unserializes with allowed_classes=false (cache.serializable_classes),
        // so a cached Eloquent collection comes back as __PHP_Incomplete_Class.
        $settings = Cache::rememberForever(
            self::cacheKey($tenantId),
            fn () => static::all()->sortBy('tenant_id')->keyBy('key')
                ->map(fn (self $setting) => ['value' => $setting->value, 'type' => $setting->type])
                ->all()
        );

        if (! array_key_exists($key, $settings)) {
            return $default;
        }

        return (new self($settings[$key]))->castValue();
    }

    private static function cacheKey(?int $tenantId): string
    {
        return 'system_settings.v2.all.'.($tenantId ?? 'platform');
    }
}
