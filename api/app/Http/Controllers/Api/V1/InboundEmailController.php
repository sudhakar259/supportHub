<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InboundEmail;
use App\Services\InboundEmail\InboundEmailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Email to ticket
 *
 * Lets a workspace turn emails sent to its support address into tickets. The
 * workspace forwards its mailbox (for example support@example.com) to the address
 * shown here; see docs/email-to-ticket.md.
 */
class InboundEmailController extends Controller
{
    /**
     * Show email-to-ticket settings
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"available": true, "address": "help@inbound.example.com", "enabled": true, "create_customers": true}}
     */
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.view'), 403, 'You do not have permission to perform this action.');

        return $this->success($this->state($request));
    }

    /**
     * Update email-to-ticket settings
     *
     * @bodyParam enabled boolean required Turn email-to-ticket on or off. Example: true
     * @bodyParam create_customers boolean required Create a customer when an unknown address emails in. If false, mail from unknown senders is rejected. Example: true
     *
     * @response 200 {"success": true, "message": "Email-to-ticket settings updated.", "data": {"enabled": true}}
     * @response 422 {"success": false, "message": "Email-to-ticket is not available on this platform yet."}
     */
    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403, 'You do not have permission to perform this action.');

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'create_customers' => ['required', 'boolean'],
        ]);

        if ($data['enabled'] && InboundEmailSettings::domain() === null) {
            return $this->error('Email-to-ticket is not available on this platform yet.', 422);
        }

        InboundEmailSettings::save($request->user()->tenant, $data['enabled'], $data['create_customers']);

        return $this->success($this->state($request), 'Email-to-ticket settings updated.');
    }

    /**
     * List received emails
     *
     * What happened to each email sent to the workspace address, newest first,
     * including the ones that were ignored or rejected and why.
     *
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "from_email": "jamie@example.com", "subject": "Cannot log in", "status": "ticket_created", "ticket_id": "01HXYZ..."}]}
     */
    public function log(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.view'), 403, 'You do not have permission to perform this action.');

        $page = InboundEmail::orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(
            $page->getCollection()->map(fn (InboundEmail $e) => $this->row($e))->all(),
            extra: ['meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ]],
        );
    }

    /** @return array<string, mixed> */
    private function state(Request $request): array
    {
        $tenant = $request->user()->tenant;

        return [
            'available' => InboundEmailSettings::domain() !== null,
            'address' => InboundEmailSettings::address($tenant),
            'enabled' => InboundEmailSettings::enabled($tenant),
            'create_customers' => InboundEmailSettings::createsCustomers($tenant),
            'recent' => InboundEmail::orderByDesc('id')->limit(10)->get()->map(fn (InboundEmail $e) => $this->row($e))->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function row(InboundEmail $e): array
    {
        return [
            'id' => $e->id,
            'from_email' => $e->from_email,
            'from_name' => $e->from_name,
            'subject' => $e->subject,
            'status' => $e->status,
            'ticket_id' => $e->ticket_id,
            'attachments_saved' => $e->attachments_saved,
            'attachments_skipped' => $e->attachments_skipped,
            'note' => $e->note,
            'received_at' => $e->created_at?->toIso8601String(),
        ];
    }
}
