<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Carbon\Carbon;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Makes a state-changing request safe to retry. A request that carries an
 * Idempotency-Key header is claimed before the handler runs: a retry with
 * the same key and body gets the stored response, a retry with a different
 * body is rejected, and a duplicate that arrives while the first is still
 * running gets 409. Only the first attempt performs the write.
 *
 * Keys are scoped to the tenant and the caller (user or API credential).
 * A claim is released when the handler throws or answers 5xx, so a failed
 * attempt can be retried with the same key.
 */
class IdempotentRequest
{
    private const HEADER = 'Idempotency-Key';

    private const TABLE = 'idempotency_keys';

    private const RETENTION_HOURS = 24;

    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header(self::HEADER);

        if ($key === null || $key === '') {
            return $next($request);
        }

        if (strlen($key) > 255) {
            return response()->json([
                'success' => false,
                'message' => 'The Idempotency-Key header must be 255 characters or fewer.',
            ], 400);
        }

        $tenantId = app(TenantContext::class)->id();
        $scope = $this->scopeFor($request);
        $fingerprint = $this->fingerprint($request);

        if ($tenantId === null || $scope === null) {
            return $next($request);
        }

        $claim = ['tenant_id' => $tenantId, 'scope' => $scope, 'key' => $key];

        if (! $this->claim($claim, $fingerprint)) {
            $existing = DB::table(self::TABLE)->where($claim)->first();

            if ($existing !== null && Carbon::parse($existing->created_at)->lt(now()->subHours(self::RETENTION_HOURS))) {
                DB::table(self::TABLE)->where($claim)->delete();

                if ($this->claim($claim, $fingerprint)) {
                    return $this->perform($request, $next, $claim);
                }

                $existing = DB::table(self::TABLE)->where($claim)->first();
            }

            return $this->replayOrReject($existing, $fingerprint);
        }

        return $this->perform($request, $next, $claim);
    }

    private function perform(Request $request, Closure $next, array $claim): Response
    {
        try {
            $response = $next($request);
        } catch (Throwable $e) {
            $this->release($claim);

            throw $e;
        }

        if ($response->getStatusCode() >= 500) {
            $this->release($claim);

            return $response;
        }

        DB::table(self::TABLE)->where($claim)->update([
            'status_code' => $response->getStatusCode(),
            'content_type' => $response->headers->get('Content-Type'),
            'response' => (string) $response->getContent(),
            'updated_at' => now(),
        ]);

        return $response;
    }

    private function claim(array $claim, string $fingerprint): bool
    {
        try {
            DB::table(self::TABLE)->insert($claim + [
                'request_hash' => $fingerprint,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return true;
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }

    private function release(array $claim): void
    {
        DB::table(self::TABLE)->where($claim)->whereNull('status_code')->delete();
    }

    private function replayOrReject(?object $existing, string $fingerprint): Response
    {
        if ($existing === null) {
            return response()->json([
                'success' => false,
                'message' => 'The request could not be processed. Please retry.',
            ], 409);
        }

        if (! hash_equals($existing->request_hash, $fingerprint)) {
            return response()->json([
                'success' => false,
                'message' => 'This Idempotency-Key was already used for a different request.',
            ], 422);
        }

        if ($existing->status_code === null) {
            return response()->json([
                'success' => false,
                'message' => 'A request with this Idempotency-Key is still being processed.',
            ], 409);
        }

        return response($existing->response, $existing->status_code)
            ->header('Content-Type', $existing->content_type ?? 'application/json')
            ->header('Idempotent-Replayed', 'true');
    }

    private function scopeFor(Request $request): ?string
    {
        $credential = $request->attributes->get('apiCredential');

        if ($credential !== null) {
            return 'credential:'.$credential->getKey();
        }

        $user = $request->user();

        return $user !== null ? 'user:'.$user->getKey() : null;
    }

    private function fingerprint(Request $request): string
    {
        $payload = $this->normalize($request->all());

        return hash('sha256', $request->method().' '.$request->path().' '.json_encode($payload, JSON_UNESCAPED_SLASHES));
    }

    private function normalize(mixed $value): mixed
    {
        if ($value instanceof UploadedFile) {
            return ['file' => $value->getClientOriginalName(), 'size' => $value->getSize()];
        }

        if (! is_array($value)) {
            return $value;
        }

        ksort($value);

        return array_map(fn ($item) => $this->normalize($item), $value);
    }
}
