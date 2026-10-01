<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Applied to every tenant-owned model. Two effects, both automatic:
 *
 *   1. Every query is transparently filtered to the current
 *      TenantContext (see TenantScope) — a controller/service never
 *      writes `where('tenant_id', ...)` itself, which is exactly the
 *      point: it can't forget to.
 *   2. tenant_id is stamped onto a new row from TenantContext at
 *      creation time, UNLESS already set (seeders provisioning a
 *      specific tenant pass it explicitly). Critically, tenant_id is
 *      never in any model's #[Fillable] list, so it can never arrive
 *      via mass assignment from request input — a client sending
 *      {"tenant_id": 2} has that value silently ignored, not honored.
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model) {
            if (is_null($model->getAttribute('tenant_id'))) {
                $model->setAttribute('tenant_id', app(TenantContext::class)->id());
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeWithoutTenantScope($query)
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }

    public function scopeForTenant($query, int|Tenant $tenant)
    {
        $tenantId = $tenant instanceof Tenant ? $tenant->id : $tenant;

        return $query->withoutGlobalScope(TenantScope::class)
            ->where($this->qualifyColumn('tenant_id'), $tenantId);
    }
}
