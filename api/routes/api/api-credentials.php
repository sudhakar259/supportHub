<?php

use App\Http\Controllers\Api\V1\ApiCredentialController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('api-credentials')->group(function () {
    Route::get('/', [ApiCredentialController::class, 'index']);
    Route::post('/', [ApiCredentialController::class, 'store']);
    Route::get('/{credential}', [ApiCredentialController::class, 'show']);
    Route::put('/{credential}', [ApiCredentialController::class, 'update']);
    Route::post('/{credential}/rotate', [ApiCredentialController::class, 'rotate']);
    Route::post('/{credential}/revoke', [ApiCredentialController::class, 'revoke']);
});
