<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'description', 'priority', 'is_active', 'stop_processing', 'conditions', 'actions'])]
class TicketRoutingRule extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'stop_processing' => 'boolean',
            'conditions' => 'array',
            'actions' => 'array',
        ];
    }
}
