<?php

use App\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

// Proveedores: administradores y encargados (coincide con el sidebar).
Route::middleware(['auth', 'can:suppliers.view'])->group(function () {
    Route::resource('suppliers', SupplierController::class);
});
