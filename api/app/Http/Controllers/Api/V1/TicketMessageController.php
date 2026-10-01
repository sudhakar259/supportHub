<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Ticket\CreateTicketMessageAction;
use App\Actions\Ticket\UploadTicketAttachmentAction;
use App\Enums\TicketMessageType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\StoreTicketMessageRequest;
use App\Http\Resources\TicketMessageResource;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Ticket Messages
 *
 * Customer messages, agent replies and internal notes on a ticket.
 * Internal notes are never returned to a customer: this is enforced by
 * excluding them from the query entirely for any caller without the
 * tickets.view_internal_notes permission, not just by hiding a field.
 */
class TicketMessageController extends Controller
{
    public function __construct(
        private CreateTicketMessageAction $createMessage,
        private UploadTicketAttachmentAction $uploadAttachment,
    ) {}

    /**
     * List messages on a ticket
     *
     * @urlParam ticket string required The ticket's id. Example: 01hxyz0123456789abcdefghj
     *
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "type": "agent_reply", "body": "Thanks for reaching out..."}]}
     */
    public function index(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $query = $ticket->messages()->with(['author', 'attachments']);

        if (! $request->user()->can('viewInternalNotes', $ticket)) {
            $query->where('type', '!=', TicketMessageType::InternalNote);
        }

        $messages = $query->orderBy('created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(TicketMessageResource::collection($messages));
    }

    /**
     * Post a message
     *
     * Customers always post as `customer_message`. Staff post as
     * `agent_reply` by default, or `internal_note` when `is_internal`
     * is true and they hold tickets.view_internal_notes — a customer
     * sending `is_internal` has it silently ignored, never honored.
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     *
     * @bodyParam body string required Example: Thanks for reaching out — can you share a screenshot of the error?
     * @bodyParam is_internal boolean Staff only. Example: false
     * @bodyParam attachments file[] Up to 5 files, 25MB each.
     *
     * @response 201 {"success": true, "message": "Message posted successfully.", "data": {"id": "01HXYZ...", "type": "agent_reply"}}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function store(StoreTicketMessageRequest $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();
        $wantsInternal = $user->isCustomer() ? false : $request->boolean('is_internal');

        $type = match (true) {
            $user->isCustomer() => TicketMessageType::CustomerMessage,
            $wantsInternal => TicketMessageType::InternalNote,
            default => TicketMessageType::AgentReply,
        };

        $this->authorize($type === TicketMessageType::InternalNote ? 'createInternalNote' : 'update', $ticket);

        $message = $this->createMessage->execute($ticket, $user, $type, $request->input('body'));

        foreach ($request->file('attachments', []) as $file) {
            $this->uploadAttachment->execute($ticket, $file, $user, $message);
        }

        return $this->created(new TicketMessageResource($message->load(['author', 'attachments'])), 'Message posted successfully.');
    }

    /**
     * Get a single message
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     * @urlParam message string required Example: 01hxyz0123456789abcdefghk
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": "01HXYZ...", "type": "agent_reply"}}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function show(Request $request, Ticket $ticket, TicketMessage $message): JsonResponse
    {
        $this->authorize('view', $ticket);

        if ($message->isInternalNote() && ! $request->user()->can('viewInternalNotes', $ticket)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $this->success(new TicketMessageResource($message->load(['author', 'attachments'])));
    }
}
