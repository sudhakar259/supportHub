<?php

namespace App\Services\Billing;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Thin client for the Razorpay Orders API plus the two signature checks
 * Razorpay requires: one for the browser payment callback, one for webhooks.
 * Keys come from config/services.php (RAZORPAY_* env vars).
 */
class RazorpayGateway
{
    public function keyId(): ?string
    {
        return config('services.razorpay.key_id') ?: null;
    }

    /**
     * @return array{id: string, amount: int, currency: string}
     */
    public function createOrder(int $amountMinorUnits, string $currency, string $receipt): array
    {
        $response = $this->client()->post('/orders', [
            'amount' => $amountMinorUnits,
            'currency' => strtoupper($currency),
            'receipt' => substr($receipt, 0, 40),
        ]);

        if ($response->failed() || ! $response->json('id')) {
            throw new BillingUnavailableException('The payment provider could not create an order. Please try again.');
        }

        return $response->json();
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        $secret = (string) config('services.razorpay.key_secret');

        if ($secret === '') {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $orderId.'|'.$paymentId, $secret), $signature);
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $secret = (string) config('services.razorpay.webhook_secret');

        if ($secret === '') {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }

    private function client(): PendingRequest
    {
        $keyId = (string) config('services.razorpay.key_id');
        $keySecret = (string) config('services.razorpay.key_secret');

        if ($keyId === '' || $keySecret === '') {
            throw new BillingUnavailableException('Online payments are not configured for this environment.');
        }

        return Http::baseUrl((string) config('services.razorpay.base_url'))
            ->withBasicAuth($keyId, $keySecret)
            ->acceptJson()
            ->asJson()
            ->timeout(10);
    }
}
