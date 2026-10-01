<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * Converts every exception thrown on an API request into the project's
 * standard { success, message, data|errors } envelope. Returning null
 * lets Laravel's default (non-API) exception rendering take over.
 */
class ApiExceptionRenderer
{
    public static function render(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        if ($e instanceof InvalidTicketStatusTransitionException) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($e instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        if ($e instanceof AuthenticationException) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($e instanceof AuthorizationException) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'You do not have permission to perform this action.',
            ], 403);
        }

        if ($e instanceof ModelNotFoundException) {
            $model = class_basename($e->getModel());

            return response()->json([
                'success' => false,
                'message' => "{$model} not found.",
            ], 404);
        }

        if ($e instanceof NotFoundHttpException) {
            return response()->json([
                'success' => false,
                'message' => 'The requested resource was not found.',
            ], 404);
        }

        if ($e instanceof TooManyRequestsHttpException) {
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.',
            ], 429);
        }

        if ($e instanceof HttpExceptionInterface) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'An error occurred.',
            ], $e->getStatusCode());
        }

        $status = 500;
        $message = 'An unexpected error occurred. Please try again later.';

        if (config('app.debug')) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: $message,
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => collect($e->getTrace())->take(15)->toArray(),
            ], $status);
        }

        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }
}
