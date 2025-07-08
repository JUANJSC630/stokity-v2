<?php

use App\Http\Controllers\BranchController;
use Illuminate\Support\Facades\Route;

// Routes for branch management (protected with auth and admin middleware)
Route::middleware(['auth', \App\Http\Middleware\AdminMiddleware::class])->group(function () {
    // Regular branch CRUD routes
    Route::get('/branches', [BranchController::class, 'index'])->name('branches.index');
    
    // Trash management route - must come before other specific routes to avoid conflicts with {branch} parameter
    Route::get('/branches/trashed', [BranchController::class, 'trashed'])->name('branches.trashed');
    
    // Creation routes
    Route::get('/branches/create', [BranchController::class, 'create'])->name('branches.create');
    Route::post('/branches', [BranchController::class, 'store'])->name('branches.store');
    
    // Routes with dynamic parameters
    Route::get('/branches/{branch}', [BranchController::class, 'show'])->name('branches.show');
    Route::get('/branches/{branch}/edit', [BranchController::class, 'edit'])->name('branches.edit');
    Route::put('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
    Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy');
    Route::put('/branches/{branch}/restore', [BranchController::class, 'restore'])->name('branches.restore');
    Route::delete('/branches/{branch}/force-delete', [BranchController::class, 'forceDelete'])->name('branches.force-delete');
});
