<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TicketAttachment */
class TicketAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_message_id' => $this->ticket_message_id,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'uploader' => new UserResource($this->whenLoaded('uploader')),
            'download_url' => route('tickets.attachments.download', ['ticket' => $this->ticket_id, 'attachment' => $this->id]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
