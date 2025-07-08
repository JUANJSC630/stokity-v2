<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    // Rutas para las páginas del sidebar - La ruta de usuarios está definida en users.php
    
    // Categories routes are defined in categories.php file
    
    Route::get('products', function () {
        return Inertia::render('products/index');
    })->name('products');
    
    Route::get('clients', function () {
        return Inertia::render('clients/index');
    })->name('clients');
    
    Route::get('sales', function () {
        return Inertia::render('sales/index');
    })->name('sales');
    
    Route::get('report-sales', function () {
        return Inertia::render('report-sales/index');
    })->name('report-sales');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/branches.php';
require __DIR__.'/users.php';
require __DIR__.'/categories.php';
