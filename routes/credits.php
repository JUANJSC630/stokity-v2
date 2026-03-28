<?php

use App\Http\Controllers\CreditSaleController;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', BranchFilterMiddleware::class])->group(function () {
    Route::get('credits', [CreditSaleController::class, 'index'])->name('credits.index');
    Route::get('credits/create', [CreditSaleController::class, 'create'])->name('credits.create');
    Route::post('credits', [CreditSaleController::class, 'store'])->name('credits.store');
    Route::get('credits/receivables', [CreditSaleController::class, 'receivables'])->name('credits.receivables');
    Route::get('credits/overdue-count', [CreditSaleController::class, 'overdueCount'])->name('credits.overdue-count');
    Route::get('credits/{credit}', [CreditSaleController::class, 'show'])->name('credits.show');
    Route::post('credits/{credit}/payments', [CreditSaleController::class, 'addPayment'])->name('credits.payments.store');
    Route::post('credits/{credit}/cancel', [CreditSaleController::class, 'cancel'])->name('credits.cancel');
});
