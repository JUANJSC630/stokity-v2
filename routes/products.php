<?php

use App\Http\Controllers\ProductController;
use App\Http\Middleware\AdminOrManagerMiddleware;
use Illuminate\Support\Facades\Route;

// Routes for product management (protected with auth and admin/manager middleware)
Route::middleware(['auth'])->group(function () {
    // Main index route - accessible to all authenticated users
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');

    // Admin and manager only routes
    Route::middleware(AdminOrManagerMiddleware::class)->group(function () {
        // Static routes must come before dynamic routes to avoid conflicts
        Route::get('/products/trashed', [ProductController::class, 'trashed'])->name('products.trashed');
        Route::get('/products/create', [ProductController::class, 'create'])->name('products.create');
        Route::post('/products', [ProductController::class, 'store'])->name('products.store');

        // Product show route - must come after any /products/specific-route to avoid conflicts
        Route::get('/products/{product}', [ProductController::class, 'show'])->name('products.show');

        // Routes with dynamic parameters
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
        Route::put('/products/{product}/restore', [ProductController::class, 'restore'])->name('products.restore');
        Route::delete('/products/{product}/force-delete', [ProductController::class, 'forceDelete'])->name('products.force-delete');

        // Stock management routes
        Route::post('/products/{product}/update-stock', [ProductController::class, 'updateStock'])->name('products.update-stock');
        // Endpoint para autogenerar código de producto
        Route::post('/products/generate-code', [ProductController::class, 'generateCode'])->name('products.generate-code');
    });
});
