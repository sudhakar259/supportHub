<?php

namespace App\Http\Resources;

use App\Models\TicketSla;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TicketSla */
class TicketSlaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'started_at' => $this->started_at?->toIso8601String(),
            'first_response_due_at' => $this->first_response_due_at?->toIso8601String(),
            'resolution_due_at' => $this->resolution_due_at?->toIso8601String(),
            'first_response_met_at' => $this->first_response_met_at?->toIso8601String(),
            'resolved_met_at' => $this->resolved_met_at?->toIso8601String(),
            'first_response_breached' => $this->first_response_breached,
            'resolution_breached' => $this->resolution_breached,
            'status' => $this->status,
        ];
    }
}
