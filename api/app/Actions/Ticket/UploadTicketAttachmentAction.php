<?php

namespace App\Actions\Ticket;

use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadTicketAttachmentAction
{
    public function execute(Ticket $ticket, UploadedFile $file, User $uploader, ?TicketMessage $message = null): TicketAttachment
    {
        $disk = config('filesystems.default');
        $path = $file->storeAs(
            "ticket-attachments/{$ticket->id}",
            Str::ulid().'.'.$file->getClientOriginalExtension(),
            $disk
        );

        return $ticket->attachments()->create([
            'ticket_message_id' => $message?->id,
            'uploaded_by' => $uploader->id,
            'disk' => $disk,
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    public function delete(TicketAttachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();
    }
}
