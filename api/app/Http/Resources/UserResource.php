<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'slug' => $this->tenant->slug,
                'workspace_url' => \App\Support\WorkspaceDomains::url($this->tenant),
                'brand' => \App\Support\BrandPalette::forTenant($this->tenant),
            ]),
            'phone' => $this->phone,
            'avatar_path' => $this->avatar_path,
            'timezone' => $this->timezone,
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'roles' => $this->whenLoaded('roles', fn () => $this->getRoleNames()),
            'permissions' => $this->when(
                $this->relationLoaded('roles') || $this->relationLoaded('permissions'),
                fn () => $this->getAllPermissions()->pluck('name')
            ),
            // Security status: the person's own, or anyone's for an administrator who manages users.
            'two_factor_enabled' => $this->when($this->canSeeSecurity($request), fn () => $this->hasTwoFactorEnabled()),
            'two_factor_recovery_codes_remaining' => $this->when($this->canSeeSecurity($request) && $this->hasTwoFactorEnabled(), fn () => count($this->two_factor_recovery_codes ?? [])),
            'locked_until' => $this->when($request->user()?->can('users.update'), fn () => $this->isLocked() ? $this->locked_until->toIso8601String() : null),
            'departments' => DepartmentResource::collection($this->whenLoaded('departments')),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function canSeeSecurity(Request $request): bool
    {
        $viewer = $request->user();

        return $viewer !== null && ($viewer->id === $this->id || $viewer->can('users.update'));
    }
}
