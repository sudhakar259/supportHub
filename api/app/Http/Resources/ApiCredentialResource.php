<?php

namespace App\Http\Resources;

use App\Models\ApiCredential;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ApiCredential */
class ApiCredentialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'key' => $this->key,
            // The full secret is returned exactly once, by
            // ApiCredentialController::store()/rotate() attaching it
            // separately — never persisted anywhere it could be
            // re-read, and never part of this resource's normal shape.
            'secret_last_four' => $this->secret_last_four,
            'scopes' => $this->scopes,
            'status' => $this->status,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'last_used_at' => $this->last_used_at?->toIso8601String(),
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
