<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasExclusiveDefault;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'level', 'color', 'is_default'])]
class TicketPriority extends Model
{
    use BelongsToTenant, HasExclusiveDefault;

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'level' => 'integer',
        ];
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'priority_id');
    }

    public static function default(): self
    {
        return static::where('is_default', true)->firstOrFail();
    }
}
