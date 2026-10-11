<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\TenantContext;
use App\Support\WorkspaceDomains;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class WorkspaceSessionController extends Controller
{
    /** Move an already authenticated session to its workspace without putting a bearer token in a URL. */
    public function issue(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->is_active && $user->tenant?->isActive(), 403, 'An active tenant account is required.');
        abort_if($user->isImpersonated(), 403, 'Use the current impersonation session in this workspace.');

        $code = Str::random(64);
        Cache::put($this->key($code), [
            'user_id' => $user->id,
            'tenant_slug' => $user->tenant->slug,
            'password_fingerprint' => hash('sha256', $user->password),
            'expires_at' => $user->currentAccessToken()?->expires_at?->toIso8601String(),
        ], now()->addMinutes(2));

        return $this->success(['code' => $code]);
    }

    /** Short-lived, single-use exchange, accepted only at the intended workspace. */
    public function exchange(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'size:64']]);
        abort_unless($request->attributes->get('workspace_slug'), 403, 'Open this sign-in link at your workspace address.');
        $key = $this->key($data['code']);

        return Cache::lock($key.':lock', 5)->block(2, function () use ($key, $request) {
            $session = Cache::get($key);
            abort_unless($session, 422, 'This workspace link has expired. Please sign in.');
            abort_unless($session['tenant_slug'] === $request->attributes->get('workspace_slug'), 403, 'This link belongs to a different workspace.');
            $user = User::withoutTenantScope()->find($session['user_id']);
            abort_unless($user && $user->is_active && $user->tenant?->isActive() && ! $user->isLocked(), 403, 'This account is unavailable.');
            abort_unless(hash_equals($session['password_fingerprint'], hash('sha256', $user->password)), 403, 'This sign-in link is no longer valid. Please sign in.');
            $expiresAt = $session['expires_at'] ? Carbon::parse($session['expires_at']) : null;
            abort_if($expiresAt?->isPast(), 403, 'This session has expired. Please sign in.');
            WorkspaceDomains::assertUserMatches($request, $user);
            Cache::forget($key);

            app(TenantContext::class)->set($user->tenant);

            return $this->success([
                'user' => new UserResource($user->load(['roles', 'customer', 'departments'])),
                'token' => $user->createToken('web-browser', ['*'], $expiresAt)->plainTextToken,
                'token_type' => 'Bearer',
            ]);
        });
    }

    private function key(string $code): string
    {
        return 'workspace-session:'.hash('sha256', $code);
    }
}
