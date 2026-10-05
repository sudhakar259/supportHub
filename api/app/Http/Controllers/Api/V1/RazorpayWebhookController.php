<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Billing\MarkInvoicePaidAction;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\Billing\RazorpayGateway;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Razorpay webhook. Public route, authenticated only by the HMAC signature
 * over the raw body, so it works even if the browser never comes back.
 */
class RazorpayWebhookController extends Controller
{
    public function handle(Request $request, RazorpayGateway $gateway, MarkInvoicePaidAction $markPaid, TenantContext $tenantContext): JsonResponse
    {
        if (! $gateway->verifyWebhookSignature($request->getContent(), (string) $request->header('X-Razorpay-Signature'))) {
            return response()->json(['success' => false, 'message' => 'Invalid signature.'], 400);
        }

        if ($request->input('event') === 'payment.captured') {
            $payment = $request->input('payload.payment.entity', []);
            $invoice = Invoice::withoutTenantScope()->where('razorpay_order_id', $payment['order_id'] ?? null)->first();

            if ($invoice && isset($payment['id'])) {
                $tenantContext->runAs($invoice->tenant, fn () => $markPaid->execute($invoice, (string) $payment['id']));
            }
        }

        return response()->json(['success' => true]);
    }
}
