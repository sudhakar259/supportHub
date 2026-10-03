<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['tenant_id', 'name', 'url', 'secret', 'events', 'is_active'])]
#[Hidden(['secret'])]
class Webhook extends Model
{
    use BelongsToTenant, HasFactory;

    public const EVENTS = [
        'ticket.created', 'ticket.updated', 'ticket.assigned', 'ticket.replied',
        'ticket.status_changed', 'ticket.resolved', 'ticket.closed', 'ticket.reopened',
    ];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
            'secret' => 'encrypted',
            'last_triggered_at' => 'datetime',
        ];
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class);
    }

    public function subscribesTo(string $event): bool
    {
        return in_array($event, $this->events ?? [], true);
    }

    public function sign(string $payload): string
    {
        return hash_hmac('sha256', $payload, $this->secret);
    }

    public static function generateSecret(): string
    {
        return 'whsec_'.Str::random(40);
    }
}
