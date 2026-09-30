<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['ticket_number_settings_id', 'period_key', 'last_number'])]
class TicketNumberSequence extends Model
{
    public function setting(): BelongsTo
    {
        return $this->belongsTo(TicketNumberSetting::class, 'ticket_number_settings_id');
    }
}
