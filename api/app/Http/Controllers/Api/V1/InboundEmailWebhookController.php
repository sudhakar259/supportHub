<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\InboundEmail\InboundEmailProcessor;
use App\Services\InboundEmail\MailgunSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Receives emails forwarded by a Mailgun inbound Route. Public, and authenticated only
 * by Mailgun's HMAC signature, like the Razorpay webhook.
 *
 * Response codes follow Mailgun's rules: 200 means "handled" (including mail we chose to
 * ignore, so it is not retried), 406 means "reject, do not retry", and any 5xx makes
 * Mailgun retry later.
 */
class InboundEmailWebhookController extends Controller
{
    public function mailgun(Request $request, MailgunSignature $signature, InboundEmailProcessor $processor): JsonResponse
    {
        // Routes forward the signature as top-level fields; webhooks nest it under "signature".
        $sig = $request->input('signature');
        $timestamp = is_array($sig) ? ($sig['timestamp'] ?? null) : $request->input('timestamp');
        $token = is_array($sig) ? ($sig['token'] ?? null) : $request->input('token');
        $value = is_array($sig) ? ($sig['signature'] ?? null) : $sig;

        if (! $signature->verify(is_scalar($timestamp) ? (string) $timestamp : null, is_scalar($token) ? (string) $token : null, is_string($value) ? $value : null)) {
            return response()->json(['success' => false, 'message' => 'Invalid signature.'], 401);
        }

        $files = $request->allFiles();
        uksort($files, 'strnatcmp'); // attachment-1, attachment-2, … attachment-10

        $record = $processor->process($request->post(), array_values($files));

        if (! $record) {
            return response()->json(['success' => false, 'message' => 'Unknown recipient.'], 406);
        }

        return response()->json(['success' => true, 'status' => $record->status]);
    }
}
