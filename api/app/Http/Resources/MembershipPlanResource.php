<?php

namespace App\Http\Resources;

use App\Models\MembershipPlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MembershipPlan */
class MembershipPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'billing_interval' => $this->billing_interval,
            'limits' => $this->limits,
            'is_active' => $this->is_active,
        ];
    }
}
