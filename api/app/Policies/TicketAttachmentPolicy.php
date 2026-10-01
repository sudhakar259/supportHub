<?php

namespace App\Policies;

use App\Enums\TicketMessageType;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

class TicketAttachmentPolicy
{
    public function view(User $user, TicketAttachment $attachment): bool
    {
        if (Gate::forUser($user)->denies('view', $attachment->ticket)) {
            return false;
        }

        if ($attachment->message?->type === TicketMessageType::InternalNote) {
            return Gate::forUser($user)->allows('viewInternalNotes', $attachment->ticket);
        }

        return true;
    }

    public function delete(User $user, TicketAttachment $attachment): bool
    {
        if ($user->id === $attachment->uploaded_by) {
            return true;
        }

        return Gate::forUser($user)->allows('update', $attachment->ticket);
    }
}
