<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductTagController;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

// Routes for product management (protected with auth and admin/manager middleware)
// JSON API for POS product search (auth only, no branch middleware needed — controller handles it)
Route::middleware(['auth', 'throttle:240,1'])->get('/api/products/search', [ProductController::class, 'search'])->name('api.products.search');

Route::middleware(['auth', BranchFilterMiddleware::class])->group(function () {
    // Main index route - accessible to all authenticated users
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');

    // Product tags (storefront labels). Gated by products.update like the rest of
    // the catalog editing; static paths first so {product_tag} never swallows them.
    Route::middleware('can:products.update')->group(function () {
        Route::get('/product-tags', [ProductTagController::class, 'index'])->name('product-tags.index');
        Route::post('/product-tags', [ProductTagController::class, 'store'])->name('product-tags.store');
        Route::post('/product-tags/assign', [ProductTagController::class, 'assign'])->name('product-tags.assign');
        Route::put('/product-tags/{product_tag}', [ProductTagController::class, 'update'])->name('product-tags.update');
        Route::delete('/product-tags/{product_tag}', [ProductTagController::class, 'destroy'])->name('product-tags.destroy');
    });

    // Admin and manager only routes
    Route::middleware('can:products.create')->group(function () {
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
        Route::post('/products/{product}/sync-suppliers', [ProductController::class, 'syncSuppliers'])->name('products.sync-suppliers');
        // Endpoint para autogenerar código de producto
        Route::post('/products/generate-code', [ProductController::class, 'generateCode'])->name('products.generate-code');
    });
});
