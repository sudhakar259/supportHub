<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Users
 */
class UserImpersonationController extends Controller
{
    /** Impersonation tokens are short-lived on purpose. */
    private const TTL_HOURS = 2;

    /**
     * Login as a user
     *
     * Lets an administrator (`users.impersonate`) act as another user in the
     * same tenant to see exactly what they see. Returns a short-lived Bearer
     * token for that user; the administrator's own token is untouched, so the
     * client can switch back by discarding this one (`POST /auth/logout` with
     * it). Not allowed on yourself, inactive users, other administrators, or
     * from inside an impersonation session. Every use is written to the audit
     * log as `user.impersonated`.
     *
     * @urlParam user integer required The user to act as. Example: 5
     *
     * @response 200 {"success": true, "message": "Now logged in as the selected user.", "data": {"user": {"id": 5}, "token": "2|abc...", "token_type": "Bearer", "expires_at": "2026-10-09T20:00:00+00:00"}}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function store(Request $request, User $user): JsonResponse
    {
        $this->authorize('impersonate', $user);

        $admin = $request->user();
        $expiresAt = now()->addHours(self::TTL_HOURS);

        $token = $user->createToken('impersonation:'.$admin->id, ['*'], $expiresAt)->plainTextToken;

        app(AuditLogger::class)->log(
            'user.impersonated',
            $user,
            null,
            ['impersonator_id' => $admin->id, 'impersonator_name' => $admin->name, 'expires_at' => $expiresAt->toIso8601String()],
            $admin,
        );

        return $this->success([
            'user' => new UserResource($user->load(['roles', 'customer', 'departments'])),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
        ], 'Now logged in as the selected user.');
    }
}
