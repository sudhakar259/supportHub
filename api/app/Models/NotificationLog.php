<?php

namespace App\Models;

use App\Enums\NotificationLogStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['notifiable_type', 'notifiable_id', 'channel', 'event_key', 'notification_template_id', 'status', 'error', 'sent_at'])]
class NotificationLog extends Model
{
    protected function casts(): array
    {
        return [
            'status' => NotificationLogStatus::class,
            'sent_at' => 'datetime',
        ];
    }

    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(NotificationTemplate::class, 'notification_template_id');
    }
}
