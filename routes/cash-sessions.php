<?php

use App\Http\Controllers\CashSessionController;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', BranchFilterMiddleware::class])->group(function () {
    Route::get('cash-sessions/current', [CashSessionController::class, 'currentSession'])->name('cash-sessions.current');
    Route::get('cash-sessions', [CashSessionController::class, 'index'])->name('cash-sessions.index');
    Route::post('cash-sessions', [CashSessionController::class, 'store'])->name('cash-sessions.store');
    Route::get('cash-sessions/{session}', [CashSessionController::class, 'show'])->name('cash-sessions.show');
    Route::get('cash-sessions/{session}/close', [CashSessionController::class, 'closeForm'])->name('cash-sessions.close.form');
    Route::post('cash-sessions/{session}/close', [CashSessionController::class, 'close'])->name('cash-sessions.close');
    Route::post('cash-sessions/{session}/movements', [CashSessionController::class, 'addMovement'])->name('cash-sessions.movements.store');
});
