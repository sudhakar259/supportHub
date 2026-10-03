<?php

namespace App\Http\Resources;

use App\Models\Webhook;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Webhook */
class WebhookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'events' => $this->events,
            'is_active' => $this->is_active,
            'last_triggered_at' => $this->last_triggered_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
