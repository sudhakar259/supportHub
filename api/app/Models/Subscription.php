<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'membership_plan_id', 'status', 'trial_ends_at', 'current_period_ends_at', 'cancelled_at'])]
class Subscription extends Model
{
    /**
     * Lapse states only move forward, so a sweep never downgrades a
     * subscription that is already further along than its overdue age.
     */
    public const LAPSE_RANK = ['active' => 0, 'past_due' => 1, 'suspended' => 2, 'expired' => 3];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'membership_plan_id');
    }

    public function isUsable(): bool
    {
        return in_array($this->status, ['trial', 'active'], true);
    }

    public function isLapsed(): bool
    {
        return in_array($this->status, ['past_due', 'suspended', 'expired'], true);
    }

    public function lapseTarget(): ?string
    {
        if ($this->status === 'trial') {
            return $this->trial_ends_at?->isPast() ? 'expired' : null;
        }

        return $this->periodLapseTarget();
    }

    public function accessBlockedMessage(): ?string
    {
        return match ($this->status) {
            'trial' => $this->trial_ends_at?->isPast() ? 'Your free trial has ended. Choose a plan to continue.' : null,
            'active' => $this->current_period_ends_at?->isPast() ? 'Your subscription period has ended. Pay the renewal invoice to continue.' : null,
            'past_due' => 'Your subscription period has ended. Pay the renewal invoice to continue.',
            'suspended' => 'Your subscription is suspended for non-payment. Pay the renewal invoice to restore access.',
            'expired' => 'Your access has expired. Choose a plan or pay the outstanding invoice to continue.',
            default => null,
        };
    }

    private function periodLapseTarget(): ?string
    {
        if (! $this->current_period_ends_at || ! array_key_exists($this->status, self::LAPSE_RANK)) {
            return null;
        }

        $periodEnd = $this->current_period_ends_at;
        $grace = (int) config('billing.grace_days');
        $expiry = $grace + (int) config('billing.expire_after_suspension_days');

        $target = match (true) {
            $periodEnd->lt(now()->subDays($expiry)) => 'expired',
            $periodEnd->lt(now()->subDays($grace)) => 'suspended',
            $periodEnd->isPast() => 'past_due',
            default => null,
        };

        return $target !== null && self::LAPSE_RANK[$target] > self::LAPSE_RANK[$this->status] ? $target : null;
    }
}
