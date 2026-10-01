<?php

namespace App\Http\Resources;

use App\Models\TicketAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TicketAssignment */
class TicketAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'assignee' => new UserResource($this->whenLoaded('assignee')),
            'previous_assignee' => new UserResource($this->whenLoaded('previousAssignee')),
            'assigned_by' => new UserResource($this->whenLoaded('assignedBy')),
            'assignment_type' => $this->assignment_type->value,
            'note' => $this->note,
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'unassigned_at' => $this->unassigned_at?->toIso8601String(),
        ];
    }
}
