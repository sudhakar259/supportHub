<?php

namespace App\Http\Controllers\Api\V1\Integration;

use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use App\Http\Resources\TicketCategoryResource;
use App\Http\Resources\TicketPriorityResource;
use App\Models\Department;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use Illuminate\Http\JsonResponse;

/**
 * @group Integration API — Lookups
 *
 * The ids a client site needs to fill its "new ticket" form (priority,
 * department, category dropdowns). Read-only, scoped to the credential's own
 * tenant, and only active departments/categories are returned. Requires the
 * tickets.create scope — these exist to build create-ticket requests.
 *
 * @unauthenticated
 *
 * @header X-Api-Key ak_abcdef1234567890abcdef1234567890
 * @header X-Api-Secret as_abcdef1234567890abcdef1234567890abcdef12345678
 */
class LookupController extends Controller
{
    /**
     * List priorities
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 11, "name": "High", "slug": "high", "level": 3, "color": "#F59E0B", "is_default": false}]}
     */
    public function priorities(): JsonResponse
    {
        return $this->success(TicketPriorityResource::collection(TicketPriority::orderBy('level')->get()));
    }

    /**
     * List departments
     *
     * Active departments only. Pass the chosen `id` as `department_id` when
     * creating a ticket. A routing rule on the tenant may still re-route the ticket.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 2, "name": "Billing", "code": "BILL", "description": "Invoices and payments", "is_active": true}]}
     */
    public function departments(): JsonResponse
    {
        return $this->success(DepartmentResource::collection(Department::where('is_active', true)->orderBy('name')->get()));
    }

    /**
     * List categories
     *
     * Active categories only. Pass the chosen `id` as `category_id` when
     * creating a ticket.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 3, "name": "Technical Issue", "slug": "technical-issue"}]}
     */
    public function categories(): JsonResponse
    {
        return $this->success(TicketCategoryResource::collection(TicketCategory::where('is_active', true)->orderBy('name')->get()));
    }
}
