<?php

use App\Http\Controllers\WholesaleSaleController;
use App\Http\Middleware\BranchFilterMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'module:wholesale', BranchFilterMiddleware::class])->group(function () {
    Route::get('wholesale', [WholesaleSaleController::class, 'index'])->name('wholesale.index')->middleware('can:wholesale.view');
    Route::get('wholesale/create', [WholesaleSaleController::class, 'create'])->name('wholesale.create')->middleware('can:wholesale.create');
    Route::post('wholesale', [WholesaleSaleController::class, 'store'])->name('wholesale.store')->middleware('can:wholesale.create');

    // Pedidos eliminados — solo quien pueda ver la papelera (admin por defecto)
    Route::middleware('can:wholesale.view_deleted')->group(function () {
        Route::get('wholesale/deleted', [WholesaleSaleController::class, 'deletedIndex'])->name('wholesale.deleted.index');
        Route::get('wholesale/deleted/{id}', [WholesaleSaleController::class, 'deletedShow'])->name('wholesale.deleted.show');
    });

    Route::get('wholesale/{wholesaleSale}', [WholesaleSaleController::class, 'show'])->name('wholesale.show')->middleware('can:wholesale.view');
    Route::get('wholesale/{wholesaleSale}/edit', [WholesaleSaleController::class, 'edit'])->name('wholesale.edit')->middleware('can:wholesale.update');
    Route::put('wholesale/{wholesaleSale}', [WholesaleSaleController::class, 'update'])->name('wholesale.update')->middleware('can:wholesale.update');
    Route::post('wholesale/{wholesaleSale}/cancel', [WholesaleSaleController::class, 'cancel'])->name('wholesale.cancel')->middleware('can:wholesale.delete');
    Route::delete('wholesale/{wholesaleSale}', [WholesaleSaleController::class, 'destroy'])->name('wholesale.destroy')->middleware('can:wholesale.delete');
});
