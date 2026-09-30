<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Departments
 *
 * Departments own tickets, staff and category groupings, and are the
 * unit that routing rules and SLA policies can be scoped to.
 */
class DepartmentController extends Controller
{
    /**
     * List departments
     *
     * @queryParam filter[name] Filter by partial name match. Example: Billing
     * @queryParam filter[code] Filter by exact department code. Example: BILL
     * @queryParam filter[is_active] Filter by active status (true/false). Example: true
     * @queryParam sort Sort by name, code or created_at. Prefix with - for descending. Example: -created_at
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": [{"id": 1, "name": "Billing", "code": "BILL", "is_active": true}],
     *   "meta": {"current_page": 1, "per_page": 25, "total": 3}
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Department::class);

        $departments = QueryBuilder::for(Department::class)
            ->allowedFilters(
                AllowedFilter::partial('name'),
                AllowedFilter::exact('code'),
                AllowedFilter::exact('is_active'),
            )
            ->allowedSorts('name', 'code', 'created_at')
            ->withCount(['users', 'tickets'])
            ->with('manager')
            ->defaultSort('name')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(DepartmentResource::collection($departments));
    }

    /**
     * Create a department
     *
     * @bodyParam name string required Example: Billing
     * @bodyParam code string required Unique short code used in ticket numbering. Example: BILL
     * @bodyParam description string A short description. Example: Invoices, payments and subscriptions.
     * @bodyParam manager_id integer The user id of the department manager. Example: 3
     * @bodyParam is_active boolean Defaults to true. Example: true
     *
     * @response 201 {"success": true, "message": "Department created successfully.", "data": {"id": 4, "name": "Billing", "code": "BILL"}}
     */
    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());

        return $this->created(new DepartmentResource($department->load('manager')), 'Department created successfully.');
    }

    /**
     * Get a department
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Billing", "code": "BILL"}}
     * @response 404 {"success": false, "message": "Department not found."}
     */
    public function show(Department $department): JsonResponse
    {
        $this->authorize('view', $department);

        return $this->success(new DepartmentResource($department->load('manager')->loadCount(['users', 'tickets'])));
    }

    /**
     * Update a department
     *
     * @bodyParam name string Example: Billing & Payments
     * @bodyParam code string Example: BILL
     * @bodyParam description string Example: Updated description.
     * @bodyParam manager_id integer Example: 3
     * @bodyParam is_active boolean Example: false
     *
     * @response 200 {"success": true, "message": "Department updated successfully.", "data": {"id": 1, "name": "Billing & Payments"}}
     */
    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());

        return $this->success(new DepartmentResource($department->load('manager')), 'Department updated successfully.');
    }

    /**
     * Delete a department
     *
     * Soft-deletes the department. Existing tickets keep their
     * department_id for historical reporting.
     *
     * @response 200 {"success": true, "message": "Department deleted successfully.", "data": null}
     */
    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        $department->delete();

        return $this->deleted('Department deleted successfully.');
    }

    /**
     * Assign a staff member to a department
     *
     * @bodyParam user_id integer required Example: 5
     * @bodyParam is_primary boolean Whether this is the agent's primary department. Example: true
     *
     * @response 200 {"success": true, "message": "User assigned to department.", "data": {"id": 1, "name": "Billing"}}
     */
    public function assignUser(Request $request, Department $department): JsonResponse
    {
        $this->authorize('manageMembers', $department);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $department->users()->syncWithoutDetaching([
            $validated['user_id'] => ['is_primary' => $validated['is_primary'] ?? false],
        ]);

        return $this->success(new DepartmentResource($department->fresh(['manager'])), 'User assigned to department.');
    }

    /**
     * Remove a staff member from a department
     *
     * @urlParam user integer required Example: 5
     *
     * @response 200 {"success": true, "message": "User removed from department.", "data": null}
     */
    public function removeUser(Department $department, User $user): JsonResponse
    {
        $this->authorize('manageMembers', $department);

        $department->users()->detach($user->id);

        return $this->deleted('User removed from department.');
    }
}
