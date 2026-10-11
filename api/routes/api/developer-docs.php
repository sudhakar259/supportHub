<?php

use App\Http\Controllers\Api\V1\DeveloperDocumentationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('developer-docs')->group(function () {
    Route::get('/', [DeveloperDocumentationController::class, 'index']);
    Route::get('/{format}', [DeveloperDocumentationController::class, 'download']);
});
