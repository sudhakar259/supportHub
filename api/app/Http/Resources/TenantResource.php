<?php

namespace App\Http\Resources;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tenant */
class TenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'workspace_url' => \App\Support\WorkspaceDomains::url($this->resource),
            'status' => $this->status,
            'email' => $this->email,
            'phone' => $this->phone,
            'website' => $this->website,
            'country' => $this->country,
            'timezone' => $this->timezone,
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'suspended_at' => $this->suspended_at?->toIso8601String(),
            'subscription' => new SubscriptionResource($this->whenLoaded('subscription')),
            // Only present when the controller eager-loads counts
            // (platform admin's tenant list/detail views) — omitted
            // entirely from the self-registration response, which has
            // no need for them.
            'users_count' => $this->whenCounted('users'),
            'customers_count' => $this->whenCounted('customers'),
            'tickets_count' => $this->whenCounted('tickets'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
