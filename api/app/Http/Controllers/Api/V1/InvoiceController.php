<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Billing\MarkInvoicePaidAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\VerifyPaymentRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\Billing\RazorpayGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Billing
 *
 * Invoices issued when a tenant moves to a paid plan, and the browser
 * callback that confirms a Razorpay payment for one of them.
 */
class InvoiceController extends Controller
{
    /**
     * List invoices
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "number": "INV-000001", "status": "pending", "amount_cents": 4900, "currency": "USD"}]}
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('billing.view')) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        $invoices = Invoice::with('plan')->latest('id')->paginate(25);

        return $this->success(InvoiceResource::collection($invoices));
    }

    /**
     * Confirm a payment
     *
     * Called by the browser after Razorpay Checkout succeeds. The signature
     * is checked with the key secret; an unsigned or mismatched payment is
     * rejected and the invoice stays pending.
     *
     * @bodyParam razorpay_order_id string required The order id the invoice was issued with. Example: order_Lx1234abcd
     * @bodyParam razorpay_payment_id string required The payment id returned by Razorpay Checkout. Example: pay_Lx1234abcd
     * @bodyParam razorpay_signature string required The signature returned by Razorpay Checkout.
     *
     * @response 200 {"success": true, "message": "Payment confirmed.", "data": {"status": "paid"}}
     */
    public function verifyPayment(VerifyPaymentRequest $request, RazorpayGateway $gateway, MarkInvoicePaidAction $markPaid): JsonResponse
    {
        $invoice = Invoice::where('razorpay_order_id', $request->string('razorpay_order_id')->toString())->firstOrFail();

        $paymentId = $request->string('razorpay_payment_id')->toString();

        if (! $gateway->verifyPaymentSignature($invoice->razorpay_order_id, $paymentId, $request->string('razorpay_signature')->toString())) {
            return $this->error('The payment signature could not be verified.', 422);
        }

        $invoice = $markPaid->execute($invoice, $paymentId);

        return $this->success(new InvoiceResource($invoice->load('plan')), 'Payment confirmed.');
    }
}
