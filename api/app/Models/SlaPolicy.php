<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name', 'description', 'priority_id', 'department_id', 'business_hours_id',
    'first_response_minutes', 'resolution_minutes', 'business_hours_only',
    'is_default', 'is_active',
])]
class SlaPolicy extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'business_hours_only' => 'boolean',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(TicketPriority::class, 'priority_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function businessHours(): BelongsTo
    {
        return $this->belongsTo(BusinessHours::class, 'business_hours_id');
    }

    public function ticketSlas(): HasMany
    {
        return $this->hasMany(TicketSla::class);
    }
}
