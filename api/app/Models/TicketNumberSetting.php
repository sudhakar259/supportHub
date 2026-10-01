<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'department_id', 'prefix', 'format', 'starting_number',
    'number_length', 'reset_period', 'is_active', 'effective_from',
])]
class TicketNumberSetting extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'effective_from' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function sequences(): HasMany
    {
        return $this->hasMany(TicketNumberSequence::class);
    }
}
