<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\ImpersonationLogController;
use App\Http\Controllers\Admin\SuperAdminController;
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Admin\TenantRoleController;
use Illuminate\Support\Facades\Route;

// Platform owner panel — manages every tenant. Restricted to super_admin.
Route::middleware(['auth', 'super_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/tenants');

    Route::get('tenants', [TenantController::class, 'index'])->name('tenants.index');
    Route::get('tenants/create', [TenantController::class, 'create'])->name('tenants.create');
    Route::post('tenants', [TenantController::class, 'store'])->name('tenants.store');
    Route::get('tenants/archived', [TenantController::class, 'archivedIndex'])->name('tenants.archived');
    Route::post('tenants/{tenant}/restore', [TenantController::class, 'restore'])->name('tenants.restore');
    Route::get('tenants/{tenant}', [TenantController::class, 'show'])->name('tenants.show');
    Route::put('tenants/{tenant}', [TenantController::class, 'update'])->name('tenants.update');
    Route::post('tenants/{tenant}/suspend', [TenantController::class, 'suspend'])->name('tenants.suspend');
    Route::post('tenants/{tenant}/activate', [TenantController::class, 'activate'])->name('tenants.activate');
    Route::post('tenants/{tenant}/users/{user}/reset-password', [TenantController::class, 'resetUserPassword'])->name('tenants.users.reset-password');
    Route::post('tenants/{tenant}/users/{user}/impersonate', [TenantController::class, 'impersonate'])
        ->name('tenants.users.impersonate');
    Route::delete('tenants/{tenant}', [TenantController::class, 'destroy'])->name('tenants.destroy');

    // Bloque 7.2 of ROLES_PERMISSIONS_PLAN.md — edit any tenant's roles
    // without impersonating its admin just to reach /settings/roles.
    Route::get('tenants/{tenant}/roles', [TenantRoleController::class, 'index'])->name('tenants.roles.index');
    Route::get('tenants/{tenant}/roles/create', [TenantRoleController::class, 'create'])->name('tenants.roles.create');
    Route::post('tenants/{tenant}/roles', [TenantRoleController::class, 'store'])->name('tenants.roles.store');
    Route::get('tenants/{tenant}/roles/{role}/edit', [TenantRoleController::class, 'edit'])->name('tenants.roles.edit');
    Route::put('tenants/{tenant}/roles/{role}', [TenantRoleController::class, 'update'])->name('tenants.roles.update');
    Route::delete('tenants/{tenant}/roles/{role}', [TenantRoleController::class, 'destroy'])->name('tenants.roles.destroy');

    Route::get('impersonations', [ImpersonationLogController::class, 'index'])->name('impersonations.index');

    Route::get('super-admins', [SuperAdminController::class, 'index'])->name('super-admins.index');
    Route::get('super-admins/create', [SuperAdminController::class, 'create'])->name('super-admins.create');
    Route::post('super-admins', [SuperAdminController::class, 'store'])->name('super-admins.store');
    Route::post('super-admins/{user}/toggle-status', [SuperAdminController::class, 'toggleStatus'])->name('super-admins.toggle-status');

    // Super-admin's own account (password) — inside /admin so IdentifyTenant allows it.
    Route::get('account', [AccountController::class, 'edit'])->name('account.edit');
    Route::put('account/password', [AccountController::class, 'updatePassword'])->name('account.password.update');
});
