<?php

namespace App\Exceptions;

use App\Services\Billing\BillingUnavailableException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
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
    public static function render(Throwable $e, Request $request): JsonResponse|Response|null
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        // Carries an already-built response (e.g. the 'integration' rate
        // limiter's Limit::response() callback in AppServiceProvider) —
        // unwrap and return it as-is rather than falling through to the
        // generic 500 below. Laravel's own handler does this unwrapping
        // automatically, but only for exceptions that reach ITS default
        // match() branch; registering a custom render() callback (this
        // class) intercepts every exception before that branch runs.
        if ($e instanceof HttpResponseException) {
            return $e->getResponse();
        }

        if ($e instanceof InvalidTicketStatusTransitionException) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($e instanceof PlanLimitExceededException) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => ['feature' => $e->feature, 'limit' => $e->limit],
            ], 403);
        }

        if ($e instanceof BillingUnavailableException) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 503);
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

        if ($e instanceof PostTooLargeException) {
            return response()->json([
                'success' => false,
                'message' => 'The uploaded content is too large. Attachments are limited to '.\App\Support\AttachmentRules::maxSizeLabel().' per file.',
            ], 413);
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

        // Unexpected errors are logged in full, but the response never carries the
        // exception class, file paths, or stack traces, in any environment.
        report($e);

        return response()->json([
            'success' => false,
            'message' => 'An unexpected error occurred. Please try again later.',
        ], 500);
    }
}
