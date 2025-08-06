<?php

use App\Http\Controllers\StockMovementController;
use App\Http\Middleware\AdminOrManagerMiddleware;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

// Routes for stock movement management (protected with auth and admin/manager middleware)
Route::middleware(['auth', BranchFilterMiddleware::class])->group(function () {
    // Main index route - accessible to all authenticated users
    Route::get('/stock-movements', [StockMovementController::class, 'index'])->name('stock-movements.index');
    Route::get('/stock-movements/statistics', [StockMovementController::class, 'statistics'])->name('stock-movements.statistics');

    // Admin and manager only routes
    Route::middleware(AdminOrManagerMiddleware::class)->group(function () {
        Route::get('/stock-movements/create', [StockMovementController::class, 'create'])->name('stock-movements.create');
        Route::post('/stock-movements', [StockMovementController::class, 'store'])->name('stock-movements.store');
        Route::get('/stock-movements/{stockMovement}', [StockMovementController::class, 'show'])->name('stock-movements.show');
    });

    // Product movements route - accessible to all authenticated users
    Route::get('/products/{product}/movements', [StockMovementController::class, 'productMovements'])->name('stock-movements.product');
}); 