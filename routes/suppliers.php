<?php

use App\Http\Controllers\SupplierController;
use App\Http\Middleware\AdminOrManagerMiddleware;
use Illuminate\Support\Facades\Route;

// Proveedores: administradores y encargados (coincide con el sidebar).
Route::middleware(['auth', AdminOrManagerMiddleware::class])->group(function () {
    Route::resource('suppliers', SupplierController::class);
});
