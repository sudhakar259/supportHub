<?php

namespace App\Models\Scopes;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * For "platform default with optional tenant override" models
 * (NotificationTemplate, SystemSetting): a tenant context sees its own
 * rows (tenant_id = current tenant) PLUS the platform defaults
 * (tenant_id IS NULL) it hasn't overridden — never another tenant's
 * overrides. No context (console/platform) sees everything unfiltered,
 * same as TenantScope.
 */
class TenantOverlayScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(TenantContext::class)->id();

        if ($tenantId !== null) {
            $column = $model->qualifyColumn('tenant_id');
            $builder->where(fn ($query) => $query->where($column, $tenantId)->orWhereNull($column));
        }
    }
}
