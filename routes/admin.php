<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\TenantController;
use Illuminate\Support\Facades\Route;

// Platform owner panel — manages every tenant. Restricted to super_admin.
Route::middleware(['auth', 'super_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/tenants');

    Route::get('tenants', [TenantController::class, 'index'])->name('tenants.index');
    Route::get('tenants/create', [TenantController::class, 'create'])->name('tenants.create');
    Route::post('tenants', [TenantController::class, 'store'])->name('tenants.store');
    Route::post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->name('tenants.suspend');
    Route::post('tenants/{tenant}/activate', [TenantController::class, 'activate'])->name('tenants.activate');

    // Super-admin's own account (password) — inside /admin so IdentifyTenant allows it.
    Route::get('account', [AccountController::class, 'edit'])->name('account.edit');
    Route::put('account/password', [AccountController::class, 'updatePassword'])->name('account.password.update');
});
