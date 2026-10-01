<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantOverlayScope;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Unlike BelongsToTenant, this does NOT stamp tenant_id onto new rows
 * automatically — a platform default (tenant_id = NULL) is a row a
 * platform admin creates deliberately, and a tenant's override is a row
 * the tenant-facing controller creates deliberately with tenant_id
 * explicitly set to the current tenant. Auto-stamping here would make
 * it impossible to ever create a platform default from within a
 * tenant-scoped request.
 */
trait HasTenantOverride
{
    protected static function bootHasTenantOverride(): void
    {
        static::addGlobalScope(new TenantOverlayScope);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeWithoutTenantScope($query)
    {
        return $query->withoutGlobalScope(TenantOverlayScope::class);
    }
}
