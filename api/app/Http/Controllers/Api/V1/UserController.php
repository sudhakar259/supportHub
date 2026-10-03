<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\PlanLimitService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Users
 *
 * Internal staff accounts (agents, senior agents, department managers,
 * administrators). Customer accounts are managed under the Customers
 * group instead.
 */
class UserController extends Controller
{
    /**
     * List users
     *
     * @queryParam filter[name] Partial name match. Example: Alex
     * @queryParam filter[email] Partial email match. Example: alex@
     * @queryParam filter[is_active] Example: true
     * @queryParam filter[role] Exact role name. Example: Agent
     * @queryParam sort Sort by name or created_at. Example: name
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 2, "name": "Alex Agent"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = QueryBuilder::for(User::class)
            ->allowedFilters(
                AllowedFilter::partial('name'),
                AllowedFilter::partial('email'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::callback('role', fn ($query, $value) => $query->whereHas('roles', fn ($q) => $q->where('name', $value))),
            )
            ->allowedSorts('name', 'created_at')
            ->with('roles', 'departments')
            ->defaultSort('name')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(UserResource::collection($users));
    }

    /**
     * Create a staff user
     *
     * Creates an internal account (agent, senior agent, department
     * manager or administrator) with a single role and optional
     * department memberships.
     *
     * @bodyParam name string required Example: Alex Agent
     * @bodyParam email string required Example: alex@supporthub.test
     * @bodyParam password string required Example: Secret123!
     * @bodyParam password_confirmation string required Example: Secret123!
     * @bodyParam phone string Example: +1-555-0100
     * @bodyParam role string required One of Agent, Senior Agent, Department Manager, Administrator. Example: Agent
     * @bodyParam department_ids integer[] Departments to assign this user to. Example: [1, 2]
     *
     * @response 201 {"success": true, "message": "User created successfully.", "data": {"id": 9, "name": "Alex Agent", "roles": ["Agent"]}}
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        app(PlanLimitService::class)->assertCanCreate($request->user()->tenant, 'users');

        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'phone' => $request->string('phone') ?: null,
                'password' => Hash::make($request->string('password')),
                'is_active' => true,
            ]);

            $user->assignRole($request->string('role')->toString());

            if ($request->filled('department_ids')) {
                $user->departments()->sync($request->input('department_ids'));
            }

            return $user;
        });

        event(new Registered($user));

        app(AuditLogger::class)->log('user.created', $user, null, ['email' => $user->email, 'role' => $request->string('role')->toString()], $request->user());

        return $this->created(new UserResource($user->load(['roles', 'departments'])), 'User created successfully.');
    }

    /**
     * Get a user
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 2, "name": "Alex Agent"}}
     */
    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return $this->success(new UserResource($user->load(['roles', 'departments', 'customer'])));
    }

    /**
     * Update a user
     *
     * Users may update their own name/phone/timezone; only holders of
     * `users.update` may change another user's record or flip
     * `is_active`.
     *
     * @bodyParam name string Example: Alex Agent
     * @bodyParam email string Example: alex@supporthub.test
     * @bodyParam phone string Example: +1-555-0199
     * @bodyParam is_active boolean Requires users.update. Example: true
     *
     * @response 200 {"success": true, "message": "User updated successfully.", "data": {"id": 2, "name": "Alex Agent"}}
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (! $request->user()->can('users.update')) {
            unset($data['is_active'], $data['email']);
        }

        $user->update($data);

        return $this->success(new UserResource($user->load(['roles', 'departments'])), 'User updated successfully.');
    }

    /**
     * Deactivate/delete a user
     *
     * Soft-deletes the account and revokes all of its API tokens.
     * An administrator cannot delete their own account.
     *
     * @response 200 {"success": true, "message": "User deleted successfully.", "data": null}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->update(['is_active' => false]);
            $user->delete();
        });

        return $this->deleted('User deleted successfully.');
    }

    /**
     * Sync a user's roles
     *
     * Replaces the user's role assignments with the given list.
     * Requires `roles.manage`.
     *
     * @bodyParam roles string[] required Role names to assign. Example: ["Senior Agent"]
     *
     * @response 200 {"success": true, "message": "Roles updated successfully.", "data": {"id": 2, "roles": ["Senior Agent"]}}
     */
    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $this->authorize('manageRoles', $user);

        $validated = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            // Scoped to the acting user's own tenant — role names like
            // "Agent" exist as a separate row per tenant, so an
            // unscoped exists check would pass for a name that's only
            // real in some OTHER tenant.
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('tenant_id', $request->user()->tenant_id)],
        ]);

        $oldRoles = $user->getRoleNames()->all();

        $user->syncRoles($validated['roles']);

        app(AuditLogger::class)->log('user.role_changed', $user, ['roles' => $oldRoles], ['roles' => $validated['roles']], $request->user());

        return $this->success(new UserResource($user->load('roles')), 'Roles updated successfully.');
    }
}
