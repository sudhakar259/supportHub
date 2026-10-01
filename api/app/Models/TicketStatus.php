<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasExclusiveDefault;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'color', 'is_default', 'is_closed', 'sort_order'])]
class TicketStatus extends Model
{
    use BelongsToTenant, HasExclusiveDefault;

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_closed' => 'boolean',
        ];
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'status_id');
    }

    public static function default(): self
    {
        return static::where('is_default', true)->firstOrFail();
    }
}
