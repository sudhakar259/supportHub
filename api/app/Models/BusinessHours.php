<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'timezone', 'schedule', 'is_default'])]
class BusinessHours extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'schedule' => 'array',
            'is_default' => 'boolean',
        ];
    }
}
