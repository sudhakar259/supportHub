<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TicketStatus */
class TicketStatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'color' => $this->color,
            'is_default' => $this->is_default,
            'is_closed' => $this->is_closed,
            'sort_order' => $this->sort_order,
        ];
    }
}
