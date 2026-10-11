<?php

namespace App\Http\Controllers\Api\V1\Integration;

use App\Actions\Ticket\CreateTicketAction;
use App\Actions\Ticket\CreateTicketMessageAction;
use App\Actions\Ticket\ReopenTicketAction;
use App\Actions\Ticket\UpdateTicketStatusAction;
use App\Actions\Ticket\UploadTicketAttachmentAction;
use App\Enums\TicketMessageType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\ReplyIntegrationTicketRequest;
use App\Http\Requests\Integration\StoreIntegrationTicketRequest;
use App\Http\Requests\Integration\UpdateIntegrationTicketRequest;
use App\Http\Requests\Integration\UpdateIntegrationTicketStatusRequest;
use App\Http\Resources\TicketAttachmentResource;
use App\Http\Resources\TicketMessageResource;
use App\Http\Resources\TicketResource;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketMessage;
use App\Models\TicketPriority;
use App\Services\PlanLimitService;
use App\Support\AttachmentRules;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

/**
 * @group Integration API — Tickets
 *
 * Same credential-based auth as the Customers integration endpoints.
 * "Reply" and "attachment" actions here are posted on behalf of the
 * ticket's customer — there is no staff Sanctum session backing this
 * credential, so there is no agent identity to attribute them to; use
 * the regular Sanctum-authenticated ticket endpoints for agent-side
 * actions.
 *
 * @unauthenticated
 *
 * @header X-Api-Key ak_abcdef1234567890abcdef1234567890
 * @header X-Api-Secret as_abcdef1234567890abcdef1234567890abcdef12345678
 */
class TicketController extends Controller
{
    public function __construct(
        private CreateTicketAction $createTicket,
        private CreateTicketMessageAction $createMessage,
        private UpdateTicketStatusAction $updateStatus,
        private ReopenTicketAction $reopenTicket,
        private UploadTicketAttachmentAction $uploadAttachment,
    ) {}

    /**
     * List ticket options
     *
     * The priorities and (active) departments a customer-facing "new
     * ticket" form can offer. Both are optional on ticket creation; omitted
     * values fall back to the tenant default priority and routing rules.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"priorities": [{"id": 2, "name": "Medium", "slug": "medium", "level": 2, "is_default": true}], "departments": [{"id": 1, "name": "Technical Support"}]}}
     */
    public function options(): JsonResponse
    {
        return $this->success([
            'priorities' => TicketPriority::orderBy('level')->get(['id', 'name', 'slug', 'level', 'is_default']),
            'departments' => Department::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * List tickets
     *
     * @queryParam customer_id integer Filter by customer. Example: 4
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 12, "ticket_number": "TKT-2026-000012"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::with(['customer.user', 'category', 'priority', 'status', 'department', 'assignee'])
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->integer('customer_id')))
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(TicketResource::collection($tickets));
    }

    /**
     * Get a ticket
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 12, "ticket_number": "TKT-2026-000012"}}
     */
    public function show(Ticket $ticket): JsonResponse
    {
        return $this->success(new TicketResource(
            $ticket->load([
                'customer.user', 'category', 'priority', 'status', 'department', 'assignee', 'sla',
                'attachments' => fn ($q) => $q->whereNull('ticket_message_id'),
            ])
        ));
    }

    /**
     * List a ticket's customer-visible messages
     *
     * Customer messages and agent replies only — internal notes are never
     * returned. Authors are reduced to a display name (no email or roles).
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "type": "agent_reply", "body": "We are looking into it.", "author_name": "Sam", "created_at": "2026-10-09T10:00:00+00:00"}]}
     */
    public function messages(Ticket $ticket): JsonResponse
    {
        $messages = $ticket->messages()
            ->where('type', '!=', TicketMessageType::InternalNote->value)
            ->with(['author:id,name', 'attachments'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type->value,
                'body' => $m->body,
                'author_name' => $m->author?->name,
                'attachments' => $m->attachments->map(fn ($a) => [
                    'id' => $a->id,
                    'original_filename' => $a->original_filename,
                    'mime_type' => $a->mime_type,
                    'size' => $a->size,
                ])->values(),
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return $this->success($messages);
    }

    /**
     * Create a ticket
     *
     * The customer is identified by exactly one of customer_id,
     * customer_email or customer_external_id — whichever the caller's
     * own system already has on hand.
     *
     * @bodyParam subject string required Example: Cannot access my account
     * @bodyParam description string required Example: Getting a 500 error at login.
     * @bodyParam customer_id integer The internal customer id, if already known. Example: 4
     * @bodyParam customer_email string The customer's email, looked up within this tenant. Example: jamie@example.com
     * @bodyParam customer_external_id string This tenant's own identifier for the customer. Example: CRM-001
     * @bodyParam category_id integer Example: 2
     * @bodyParam priority_id integer Example: 3
     * @bodyParam attachments file[] Optional, sent as multipart/form-data. Up to 5 files, 2 MB each. Needs the tickets.attachments scope as well as tickets.create.
     * @bodyParam department_id integer An active department; see GET /ticket-options. Example: 1
     *
     * @response 201 {"success": true, "message": "Ticket created successfully.", "data": {"id": 12, "ticket_number": "TKT-2026-000012"}}
     * @response 404 {"success": false, "message": "No matching customer found for the given identifier."}
     */
    public function store(StoreIntegrationTicketRequest $request): JsonResponse
    {
        $customer = Customer::query()
            ->when($request->filled('customer_id'), fn ($q) => $q->where('id', $request->integer('customer_id')))
            ->when($request->filled('customer_external_id'), fn ($q) => $q->where('external_id', $request->string('customer_external_id')))
            ->when($request->filled('customer_email'), fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('email', $request->string('customer_email'))))
            ->first();

        if (! $customer) {
            return $this->error('No matching customer found for the given identifier.', 404);
        }

        app(PlanLimitService::class)->assertCanCreate(app(TenantContext::class)->get(), 'tickets_per_month');

        $files = $request->file('attachments', []);

        // Same rule as replies: files are an attachment upload, so they need
        // that scope too.
        if ($files !== [] && ! $request->attributes->get('apiCredential')?->hasScope('tickets.attachments')) {
            return $this->error('This API credential does not have the required scope: tickets.attachments.', 403);
        }

        $ticket = $this->createTicket->execute($customer, Arr::except($request->validated(), ['attachments']));

        foreach ($files as $file) {
            $this->uploadAttachment->execute($ticket, $file, $customer->user);
        }

        return $this->created(new TicketResource($ticket->load(['attachments' => fn ($q) => $q->whereNull('ticket_message_id')])), 'Ticket created successfully.');
    }

    /**
     * Update a ticket
     *
     * @bodyParam subject string Example: Cannot access my account (updated)
     * @bodyParam description string Example: Still happening after clearing cache.
     * @bodyParam category_id integer Example: 2
     * @bodyParam priority_id integer Example: 3
     *
     * @response 200 {"success": true, "message": "Ticket updated successfully.", "data": {"id": 12}}
     */
    public function update(UpdateIntegrationTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $ticket->update($request->validated());

        return $this->success(new TicketResource($ticket->fresh(['category', 'priority'])), 'Ticket updated successfully.');
    }

    /**
     * Reply to a ticket as the customer
     *
     * Syncs a message from another channel (chat widget, email, CRM)
     * into the ticket thread, attributed to the ticket's own customer.
     *
     * @bodyParam body string required Example: Any update on this?
     * @bodyParam attachments file[] Optional, sent as multipart/form-data. Up to 5 files, 2 MB each (jpg, jpeg, png, webp, txt, pdf, docx, ppt, pptx). Needs the tickets.attachments scope as well as tickets.reply.
     *
     * @response 201 {"success": true, "message": "Reply added successfully.", "data": {"id": 9, "body": "Any update on this?"}}
     */
    public function reply(ReplyIntegrationTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $files = $request->file('attachments', []);

        // Files on a reply are an attachment upload, so they need that scope
        // too — tickets.reply alone must not become a way around it.
        if ($files !== [] && ! $request->attributes->get('apiCredential')?->hasScope('tickets.attachments')) {
            return $this->error('This API credential does not have the required scope: tickets.attachments.', 403);
        }

        $customerUser = $ticket->customer->user;

        $message = $this->createMessage->execute(
            $ticket,
            $customerUser,
            TicketMessageType::CustomerMessage,
            $request->string('body')->toString(),
        );

        foreach ($files as $file) {
            $this->uploadAttachment->execute($ticket, $file, $customerUser, $message);
        }

        return $this->created(new TicketMessageResource($message->load(['author', 'attachments'])), 'Reply added successfully.');
    }

    /**
     * Update a ticket's status
     *
     * @bodyParam status string required One of open, in-progress, pending, escalated, resolved, closed, reopened. Example: resolved
     * @bodyParam reason string Example: Customer confirmed the fix worked.
     *
     * @response 200 {"success": true, "message": "Ticket status updated successfully.", "data": {"id": 12, "status": {"slug": "resolved"}}}
     * @response 422 {"success": false, "message": "Cannot transition from closed to open."}
     */
    public function updateStatus(UpdateIntegrationTicketStatusRequest $request, Ticket $ticket): JsonResponse
    {
        $ticket = $this->updateStatus->execute($ticket, $request->string('status')->toString(), null, $request->string('reason')->toString() ?: null);

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket status updated successfully.');
    }

    /**
     * Reopen a ticket as the customer
     *
     * For when a ticket was resolved or closed but the problem is not
     * actually fixed. Unlike the general status endpoint this can only move
     * a ticket to "reopened", so a customer-facing site can expose it
     * without being able to resolve or close tickets. Only Resolved and
     * Closed tickets can be reopened.
     *
     * @bodyParam reason string Why the ticket is being reopened. Example: The issue came back after the fix.
     *
     * @response 200 {"success": true, "message": "Ticket reopened successfully.", "data": {"id": 12, "status": {"slug": "reopened"}}}
     * @response 422 {"success": false, "message": "Cannot transition from open to reopened."}
     */
    public function reopen(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['reason' => ['sometimes', 'nullable', 'string', 'max:2000']]);

        $ticket = $this->reopenTicket->execute($ticket, $ticket->customer->user, $request->input('reason'));

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket reopened successfully.');
    }

    /**
     * List a ticket's attachments
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "original_filename": "screenshot.png"}]}
     */
    public function attachments(Ticket $ticket): JsonResponse
    {
        // Customer-uploaded files only — never staff files or internal-note attachments.
        return $this->success(TicketAttachmentResource::collection(
            $ticket->attachments()->where('uploaded_by', $ticket->customer->user_id)->get()
        ));
    }

    /**
     * Download a ticket attachment
     *
     * Streams the file. Attachments that belong to another ticket, or to an
     * internal note, are reported as not found.
     *
     * @response 404 {"success": false, "message": "The requested resource was not found."}
     */
    public function downloadAttachment(Ticket $ticket, TicketAttachment $attachment)
    {
        $message = $attachment->ticket_message_id ? TicketMessage::find($attachment->ticket_message_id) : null;

        if ($attachment->ticket_id !== $ticket->id || $message?->isInternalNote()
            || (! $message && $attachment->uploaded_by !== $ticket->customer->user_id)) {
            return $this->error('The requested resource was not found.', 404);
        }

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_filename);
    }

    /**
     * Upload a ticket attachment as the customer
     *
     * @bodyParam file file required Max 2 MB. One of jpg, jpeg, png, webp, txt, pdf, docx, ppt, pptx.
     *
     * @response 201 {"success": true, "message": "Attachment uploaded successfully.", "data": {"id": "01HXYZ...", "original_filename": "invoice.pdf"}}
     */
    public function storeAttachment(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'file' => ['required', ...AttachmentRules::file()],
        ]);

        $attachment = $this->uploadAttachment->execute($ticket, $request->file('file'), $ticket->customer->user);

        return $this->created(new TicketAttachmentResource($attachment), 'Attachment uploaded successfully.');
    }
}
