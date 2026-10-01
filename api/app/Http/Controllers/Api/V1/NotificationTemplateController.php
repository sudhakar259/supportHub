<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationTemplateResource;
use App\Models\NotificationTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Notifications
 *
 * Admin-editable email content. Supported variables:
 * {ticket_number} {customer_name} {agent_name} {department}
 * {ticket_subject} {ticket_status} {ticket_priority} {ticket_url}
 */
class NotificationTemplateController extends Controller
{
    /**
     * List notification templates
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"key": "ticket_created", "subject": "We received your ticket {ticket_number}"}]}
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('notifications.view'), 403, 'You do not have permission to perform this action.');

        return $this->success(NotificationTemplateResource::collection(NotificationTemplate::all()));
    }

    /**
     * Update a notification template
     *
     * @urlParam template integer required Example: 1
     *
     * @bodyParam subject string Example: We received your ticket {ticket_number}
     * @bodyParam body string Example: Hi {customer_name}, your ticket has been created...
     * @bodyParam is_active boolean Example: true
     *
     * @response 200 {"success": true, "message": "Notification template updated successfully.", "data": {"key": "ticket_created"}}
     */
    public function update(Request $request, NotificationTemplate $template): JsonResponse
    {
        abort_unless($request->user()->can('notifications.manage'), 403, 'You do not have permission to perform this action.');

        $validated = $request->validate([
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'body' => ['sometimes', 'required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->update($validated);

        return $this->success(new NotificationTemplateResource($template), 'Notification template updated successfully.');
    }
}
