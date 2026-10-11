<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** One row per email Mailgun delivered to a workspace, whatever became of it. */
#[Fillable(['message_id', 'from_email', 'from_name', 'subject', 'recipient', 'status', 'ticket_id', 'attachments_saved', 'attachments_skipped', 'note'])]
class InboundEmail extends Model
{
    use BelongsToTenant;

    public const PROCESSING = 'processing';

    public const TICKET_CREATED = 'ticket_created';

    public const REPLY_ADDED = 'reply_added';

    public const FAILED = 'failed';
}
