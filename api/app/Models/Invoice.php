<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'subscription_id', 'membership_plan_id', 'amount_cents', 'currency', 'billing_interval', 'status', 'razorpay_order_id', 'razorpay_payment_id', 'paid_at'])]
class Invoice extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'membership_plan_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
