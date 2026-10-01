<?php

namespace App\Models;

use App\Models\Concerns\HasTenantOverride;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'key', 'name', 'subject', 'body', 'channel', 'is_active'])]
class NotificationTemplate extends Model
{
    use HasTenantOverride;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
