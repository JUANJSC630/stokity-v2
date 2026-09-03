<?php

use App\Http\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'can:payment_methods.create'])->group(function () {
    Route::resource('payment-methods', PaymentMethodController::class);
    Route::patch('payment-methods/{paymentMethod}/toggle', [PaymentMethodController::class, 'toggleActive'])->name('payment-methods.toggle');
    Route::post('payment-methods/reorder', [PaymentMethodController::class, 'reorder'])->name('payment-methods.reorder');
});

// API route for getting active payment methods (auth required for this route)
Route::middleware('auth')->get('api/payment-methods/active', [PaymentMethodController::class, 'getActive'])->name('api.payment-methods.active');
