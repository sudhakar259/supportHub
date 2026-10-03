<?php

namespace App\Http\Resources;

use App\Models\WebhookDelivery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin WebhookDelivery */
class WebhookDeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event' => $this->event,
            'response_status' => $this->response_status,
            'success' => $this->success,
            'attempt' => $this->attempt,
            'attempted_at' => $this->attempted_at?->toIso8601String(),
        ];
    }
}
