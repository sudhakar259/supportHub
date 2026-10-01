<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ticket_id', 'sla_policy_id', 'started_at', 'first_response_due_at', 'resolution_due_at',
    'first_response_met_at', 'resolved_met_at', 'first_response_breached', 'resolution_breached', 'status',
])]
class TicketSla extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'first_response_due_at' => 'datetime',
            'resolution_due_at' => 'datetime',
            'first_response_met_at' => 'datetime',
            'resolved_met_at' => 'datetime',
            'first_response_breached' => 'boolean',
            'resolution_breached' => 'boolean',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function slaPolicy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class);
    }
}
