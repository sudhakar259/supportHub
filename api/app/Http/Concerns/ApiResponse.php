<?php

namespace App\Http\Concerns;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * Wraps every controller response in the project's standard envelope:
 * { "success": bool, "message": string, "data"|"errors": ... }
 */
trait ApiResponse
{
    protected function success(
        mixed $data = null,
        string $message = 'Request successful.',
        int $status = 200,
        array $extra = []
    ): JsonResponse {
        $payload = [
            'success' => true,
            'message' => $message,
        ];

        if ($data instanceof ResourceCollection) {
            $wrapped = $data->response()->getData(true);
            $payload['data'] = $wrapped['data'] ?? [];

            foreach (['meta', 'links'] as $key) {
                if (array_key_exists($key, $wrapped)) {
                    $payload[$key] = $wrapped[$key];
                }
            }
        } elseif ($data instanceof JsonResource) {
            $payload['data'] = $data->response()->getData(true)['data'] ?? $data;
        } else {
            $payload['data'] = $data;
        }

        return response()->json(array_merge($payload, $extra), $status);
    }

    protected function created(mixed $data = null, string $message = 'Created successfully.'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    protected function deleted(string $message = 'Deleted successfully.'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => null,
        ], 200);
    }

    protected function error(string $message, int $status = 400, mixed $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
