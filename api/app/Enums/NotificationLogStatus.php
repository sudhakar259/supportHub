<?php

namespace App\Enums;

enum NotificationLogStatus: string
{
    case Queued = 'queued';
    case Sent = 'sent';
    case Failed = 'failed';
}
