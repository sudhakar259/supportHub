<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Ticket */
class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'subject' => $this->subject,
            'description' => $this->description,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'category' => new TicketCategoryResource($this->whenLoaded('category')),
            'priority' => new TicketPriorityResource($this->whenLoaded('priority')),
            'status' => new TicketStatusResource($this->whenLoaded('status')),
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'assignee' => new UserResource($this->whenLoaded('assignee')),
            'sla' => new TicketSlaResource($this->whenLoaded('sla')),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
            'reopened_count' => $this->reopened_count,
            'first_response_at' => $this->first_response_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
