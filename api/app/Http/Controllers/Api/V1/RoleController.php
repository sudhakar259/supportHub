<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

/**
 * @group Roles & Permissions
 *
 * The 5 built-in roles (Administrator, Department Manager, Senior Agent,
 * Agent, Customer) cover the standard workforce shape; additional
 * custom roles can be created here and assigned any subset of the
 * permissions listed by GET /permissions. The Administrator and
 * Customer roles cannot be deleted.
 */
class RoleController extends Controller
{
    /**
     * List roles
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Administrator", "permissions": ["tickets.view", "..."]}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::with('permissions')->withCount('users')->get();

        return $this->success(RoleResource::collection($roles));
    }

    /**
     * Create a role
     *
     * @bodyParam name string required Example: Billing Specialist
     * @bodyParam permissions string[] Permission names to grant. Example: ["tickets.view", "tickets.update"]
     *
     * @response 201 {"success": true, "message": "Role created successfully.", "data": {"id": 6, "name": "Billing Specialist"}}
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = Role::create(['name' => $request->string('name'), 'guard_name' => 'api']);

        if ($request->filled('permissions')) {
            $role->syncPermissions($request->input('permissions'));
        }

        return $this->created(new RoleResource($role->load('permissions')), 'Role created successfully.');
    }

    /**
     * Get a role
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Administrator"}}
     */
    public function show(Role $role): JsonResponse
    {
        $this->authorize('view', $role);

        return $this->success(new RoleResource($role->load('permissions')->loadCount('users')));
    }

    /**
     * Update a role
     *
     * @bodyParam name string Example: Billing Specialist
     * @bodyParam permissions string[] Replaces the role's permission set entirely. Example: ["tickets.view"]
     *
     * @response 200 {"success": true, "message": "Role updated successfully.", "data": {"id": 6, "name": "Billing Specialist"}}
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        if ($request->filled('name')) {
            $role->update(['name' => $request->string('name')]);
        }

        if ($request->has('permissions')) {
            $role->syncPermissions($request->input('permissions'));
        }

        return $this->success(new RoleResource($role->load('permissions')), 'Role updated successfully.');
    }

    /**
     * Delete a role
     *
     * @response 200 {"success": true, "message": "Role deleted successfully.", "data": null}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function destroy(Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        $role->delete();

        return $this->deleted('Role deleted successfully.');
    }
}
