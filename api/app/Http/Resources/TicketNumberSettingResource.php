<?php

namespace App\Http\Resources;

use App\Models\TicketNumberSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TicketNumberSetting */
class TicketNumberSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'prefix' => $this->prefix,
            'format' => $this->format,
            'starting_number' => $this->starting_number,
            'number_length' => $this->number_length,
            'reset_period' => $this->reset_period,
            'is_active' => $this->is_active,
            'effective_from' => $this->effective_from?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
