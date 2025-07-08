<?php

use App\Http\Controllers\CategoryController;
use App\Http\Middleware\AdminOrManagerMiddleware;
use Illuminate\Support\Facades\Route;

// Routes for category management (protected with auth and admin/manager middleware)
Route::middleware(['auth'])->middleware(AdminOrManagerMiddleware::class)->group(function () {
    // Main index route
    Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    
    // Trash management route - must come before other specific routes to avoid conflicts with {category} parameter
    Route::get('/categories/trashed', [CategoryController::class, 'trashed'])->name('categories.trashed');
    
    // Creation routes
    Route::get('/categories/create', [CategoryController::class, 'create'])->name('categories.create');
    Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
    
    // Routes with dynamic parameters
    Route::get('/categories/{category}', [CategoryController::class, 'show'])->name('categories.show');
    Route::get('/categories/{category}/edit', [CategoryController::class, 'edit'])->name('categories.edit');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
    Route::put('/categories/{category}/restore', [CategoryController::class, 'restore'])->name('categories.restore');
    Route::delete('/categories/{category}/force-delete', [CategoryController::class, 'forceDelete'])->name('categories.force-delete');
});
