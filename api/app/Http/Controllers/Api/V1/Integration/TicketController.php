<?php

namespace App\Http\Controllers\Api\V1\Integration;

use App\Actions\Ticket\CreateTicketAction;
use App\Actions\Ticket\CreateTicketMessageAction;
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
use App\Models\Ticket;
use App\Services\PlanLimitService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        private UploadTicketAttachmentAction $uploadAttachment,
    ) {}

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
            $ticket->load(['customer.user', 'category', 'priority', 'status', 'department', 'assignee', 'sla'])
        ));
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

        $ticket = $this->createTicket->execute($customer, $request->validated());

        return $this->created(new TicketResource($ticket), 'Ticket created successfully.');
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
     *
     * @response 201 {"success": true, "message": "Reply added successfully.", "data": {"id": 9, "body": "Any update on this?"}}
     */
    public function reply(ReplyIntegrationTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $message = $this->createMessage->execute(
            $ticket,
            $ticket->customer->user,
            TicketMessageType::CustomerMessage,
            $request->string('body')->toString(),
        );

        return $this->created(new TicketMessageResource($message->load('author')), 'Reply added successfully.');
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
     * List a ticket's attachments
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "original_filename": "screenshot.png"}]}
     */
    public function attachments(Ticket $ticket): JsonResponse
    {
        return $this->success(TicketAttachmentResource::collection($ticket->attachments()->get()));
    }

    /**
     * Upload a ticket attachment as the customer
     *
     * @bodyParam file file required Max 25MB. One of jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, txt, csv, zip.
     *
     * @response 201 {"success": true, "message": "Attachment uploaded successfully.", "data": {"id": "01HXYZ...", "original_filename": "invoice.pdf"}}
     */
    public function storeAttachment(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:25600', 'mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,csv,zip', 'extensions:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,csv,zip'],
        ]);

        $attachment = $this->uploadAttachment->execute($ticket, $request->file('file'), $ticket->customer->user);

        return $this->created(new TicketAttachmentResource($attachment), 'Attachment uploaded successfully.');
    }
}
