<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TicketMessage */
class TicketMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_id' => $this->ticket_id,
            'type' => $this->type->value,
            'body' => $this->body,
            'author' => new UserResource($this->whenLoaded('author')),
            'attachments' => TicketAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
