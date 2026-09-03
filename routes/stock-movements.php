<?php

use App\Http\Controllers\StockMovementController;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

// Movimientos de stock: administradores y encargados (coincide con el sidebar).
Route::middleware(['auth', BranchFilterMiddleware::class, 'can:stock_movements.view'])->group(function () {
    Route::get('/stock-movements', [StockMovementController::class, 'index'])->name('stock-movements.index');
    Route::get('/stock-movements/statistics', [StockMovementController::class, 'statistics'])->name('stock-movements.statistics');

    // Static routes must come before dynamic routes to avoid conflicts
    Route::get('/stock-movements/create', [StockMovementController::class, 'create'])->name('stock-movements.create');
    Route::post('/stock-movements', [StockMovementController::class, 'store'])->name('stock-movements.store');
    Route::get('/stock-movements/{stockMovement}', [StockMovementController::class, 'show'])->name('stock-movements.show');

    Route::get('/products/{product}/movements', [StockMovementController::class, 'productMovements'])->name('stock-movements.product');
});
