<?php

use App\Http\Controllers\Api\V1\TicketAttachmentController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TicketMessageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('tickets')->name('tickets.')->scopeBindings()->group(function () {
    Route::get('/', [TicketController::class, 'index'])->name('index');
    Route::post('/', [TicketController::class, 'store'])->name('store')->middleware('idempotent');
    Route::get('/{ticket}', [TicketController::class, 'show'])->name('show');
    Route::put('/{ticket}', [TicketController::class, 'update'])->name('update');
    Route::delete('/{ticket}', [TicketController::class, 'destroy'])->name('destroy');

    Route::post('/{ticket}/assign', [TicketController::class, 'assign'])->name('assign')->middleware('idempotent');
    Route::post('/{ticket}/reassign', [TicketController::class, 'assign'])->name('reassign')->middleware('idempotent');
    Route::post('/{ticket}/escalate', [TicketController::class, 'escalate'])->name('escalate')->middleware('idempotent');
    Route::post('/{ticket}/resolve', [TicketController::class, 'resolve'])->name('resolve')->middleware('idempotent');
    Route::post('/{ticket}/close', [TicketController::class, 'close'])->name('close')->middleware('idempotent');
    Route::post('/{ticket}/reopen', [TicketController::class, 'reopen'])->name('reopen')->middleware('idempotent');

    Route::get('/{ticket}/activities', [TicketController::class, 'activities'])->name('activities.index');

    Route::get('/{ticket}/messages', [TicketMessageController::class, 'index'])->name('messages.index');
    Route::post('/{ticket}/messages', [TicketMessageController::class, 'store'])->name('messages.store')->middleware('idempotent');
    Route::get('/{ticket}/messages/{message}', [TicketMessageController::class, 'show'])->name('messages.show');

    Route::get('/{ticket}/attachments', [TicketAttachmentController::class, 'index'])->name('attachments.index');
    Route::post('/{ticket}/attachments', [TicketAttachmentController::class, 'store'])->name('attachments.store')->middleware('idempotent');
    Route::get('/{ticket}/attachments/{attachment}/download', [TicketAttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/{ticket}/attachments/{attachment}', [TicketAttachmentController::class, 'destroy'])->name('attachments.destroy');
});
