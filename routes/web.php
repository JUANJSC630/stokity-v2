<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');

    // Rutas para las páginas del sidebar - La ruta de usuarios está definida en users.php

    // Categories routes are defined in categories.php file
    // Products routes are defined in products.php file

    // Clients routes are defined in clients.php file

    Route::get('report-sales', function () {
        return Inertia::render('report-sales/index');
    })->name('report-sales');

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/branches.php';
require __DIR__.'/users.php';
require __DIR__.'/categories.php';
require __DIR__.'/products.php';
require __DIR__.'/clients.php';
require __DIR__.'/sales.php';
require __DIR__.'/reports.php';
require __DIR__.'/stock-movements.php';
require __DIR__.'/payment-methods.php';
require __DIR__.'/printing.php';
require __DIR__.'/cash-sessions.php';
require __DIR__.'/suppliers.php';
require __DIR__.'/finances.php';
require __DIR__.'/credits.php';
