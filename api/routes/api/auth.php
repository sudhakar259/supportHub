<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TwoFactorController;
use App\Http\Controllers\Api\V1\WorkspaceSessionController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->name('auth.register');
        Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
        Route::post('/two-factor/challenge', [AuthController::class, 'twoFactorChallenge'])->name('auth.two-factor.challenge');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('auth.forgot-password');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('auth.reset-password');
        Route::post('/workspace-session', [WorkspaceSessionController::class, 'exchange'])->name('auth.workspace-session');
    });

    // Named exactly "verification.verify" (no "auth." prefix) because Laravel's
    // built-in VerifyEmail notification hardcodes this route name when it
    // builds the signed verification link.
    Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::middleware('auth:api')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/workspace-handoff', [WorkspaceSessionController::class, 'issue'])->name('auth.workspace-handoff');

        Route::prefix('two-factor')->group(function () {
            Route::post('/setup', [TwoFactorController::class, 'setup'])->name('auth.two-factor.setup');
            Route::post('/confirm', [TwoFactorController::class, 'confirm'])->name('auth.two-factor.confirm');
            Route::post('/disable', [TwoFactorController::class, 'disable'])->name('auth.two-factor.disable');
            Route::post('/recovery-codes', [TwoFactorController::class, 'recoveryCodes'])->name('auth.two-factor.recovery-codes');
        });
        Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});
