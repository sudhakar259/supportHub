<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Ticket\UploadTicketAttachmentAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\TicketAttachmentResource;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * @group Ticket Attachments
 *
 * Files are validated on MIME type, extension and size at upload time
 * (see StoreTicketMessageRequest / this controller's own rules) and
 * are never served directly from public storage — every download goes
 * through the authorization check in TicketAttachmentPolicy, which
 * also denies customers access to a file attached to an internal note.
 */
class TicketAttachmentController extends Controller
{
    public function __construct(private UploadTicketAttachmentAction $uploadAttachment) {}

    /**
     * List a ticket's attachments
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "original_filename": "screenshot.png"}]}
     */
    public function index(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $attachments = $ticket->attachments()->with('uploader')->get()
            ->filter(fn (TicketAttachment $attachment) => $request->user()->can('view', $attachment))
            ->values();

        return $this->success(TicketAttachmentResource::collection($attachments));
    }

    /**
     * Upload a ticket-level attachment
     *
     * For a file attached directly to the ticket rather than a specific
     * message. To attach a file to a message, use the `attachments[]`
     * field on POST /tickets/{ticket}/messages instead.
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     *
     * @bodyParam file file required Max 25MB. One of jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, txt, csv, zip.
     *
     * @response 201 {"success": true, "message": "Attachment uploaded successfully.", "data": {"id": "01HXYZ...", "original_filename": "invoice.pdf"}}
     */
    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('update', $ticket);

        $request->validate([
            'file' => ['required', 'file', 'max:25600', 'mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,csv,zip'],
        ]);

        $attachment = $this->uploadAttachment->execute($ticket, $request->file('file'), $request->user());

        return $this->created(new TicketAttachmentResource($attachment->load('uploader')), 'Attachment uploaded successfully.');
    }

    /**
     * Download an attachment
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     * @urlParam attachment string required Example: 01hxyz0123456789abcdefghm
     *
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     * @response 404 {"success": false, "message": "TicketAttachment not found."}
     */
    public function download(Ticket $ticket, TicketAttachment $attachment)
    {
        $this->authorize('view', $attachment);

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_filename);
    }

    /**
     * Delete an attachment
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     * @urlParam attachment string required Example: 01hxyz0123456789abcdefghm
     *
     * @response 200 {"success": true, "message": "Attachment deleted successfully.", "data": null}
     */
    public function destroy(Ticket $ticket, TicketAttachment $attachment): JsonResponse
    {
        $this->authorize('delete', $attachment);

        $this->uploadAttachment->delete($attachment);

        return $this->deleted('Attachment deleted successfully.');
    }
}
