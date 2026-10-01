<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'description', 'price_cents', 'currency', 'billing_interval', 'limits', 'is_active', 'sort_order'])]
class MembershipPlan extends Model
{
    protected function casts(): array
    {
        return [
            'limits' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Null means unlimited for that feature.
     */
    public function limit(string $feature): ?int
    {
        return $this->limits[$feature] ?? null;
    }
}
