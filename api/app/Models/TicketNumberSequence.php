<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketNumberSequence extends Model
{
    public function setting(): BelongsTo
    {
        return $this->belongsTo(TicketNumberSetting::class, 'ticket_number_settings_id');
    }
}
