<?php

use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\RazorpayWebhookController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('subscription')->group(function () {
    Route::get('/', [SubscriptionController::class, 'show']);
    Route::put('/', [SubscriptionController::class, 'update']);
    Route::post('/cancel', [SubscriptionController::class, 'cancel']);
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/payments/verify', [InvoiceController::class, 'verifyPayment']);
});

Route::post('/billing/razorpay/webhook', [RazorpayWebhookController::class, 'handle']);
