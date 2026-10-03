<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

/**
 * @group Roles & Permissions
 *
 * Permissions are fixed at the code level (defined in
 * RolesAndPermissionsSeeder) rather than creatable via the API, since
 * an ad-hoc permission with no matching Gate check anywhere would be
 * meaningless. This endpoint lists what exists so role management can
 * reference them.
 */
class PermissionController extends Controller
{
    /**
     * List permissions
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "tickets.view"}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        return $this->success(PermissionResource::collection(Permission::orderBy('name')->get()));
    }
}
