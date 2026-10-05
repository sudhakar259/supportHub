<?php

namespace App\Http\Resources;

use App\Services\Billing\RazorpayGateway;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $checkout = $this->status === 'pending' && $this->razorpay_order_id
            ? [
                'key_id' => app(RazorpayGateway::class)->keyId(),
                'order_id' => $this->razorpay_order_id,
                'amount_cents' => $this->amount_cents,
                'currency' => $this->currency,
            ]
            : null;

        return [
            'id' => $this->id,
            'number' => sprintf('INV-%06d', $this->id),
            'status' => $this->status,
            'amount_cents' => $this->amount_cents,
            'currency' => $this->currency,
            'billing_interval' => $this->billing_interval,
            'plan' => $this->whenLoaded('plan', fn () => [
                'name' => $this->plan->name,
                'slug' => $this->plan->slug,
            ]),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'issued_at' => $this->created_at?->toIso8601String(),
            'checkout' => $checkout,
        ];
    }
}
