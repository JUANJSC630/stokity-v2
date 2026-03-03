<?php

use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\BusinessSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TicketSettingController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', AdminMiddleware::class])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::post('settings/appearance/default-product-image', [AppearanceController::class, 'updateDefaultProductImage'])->name('appearance.default-product-image');

    Route::get('settings/business', [BusinessSettingController::class, 'edit'])->name('settings.business');
    Route::post('settings/business', [BusinessSettingController::class, 'update'])->name('settings.business.update');

    Route::get('settings/printer', function () {
        return Inertia::render('settings/printer');
    })->name('settings.printer');

    Route::get('settings/ticket', [TicketSettingController::class, 'edit'])->name('settings.ticket');
    Route::post('settings/ticket', [TicketSettingController::class, 'update'])->name('settings.ticket.update');
});
