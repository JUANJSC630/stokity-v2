<?php

use App\Http\Controllers\Api\Store\StoreBranchController;
use App\Http\Controllers\Api\Store\StoreCategoryController;
use App\Http\Controllers\Api\Store\StoreInfoController;
use App\Http\Controllers\Api\Store\StorePaymentMethodController;
use App\Http\Controllers\Api\Store\StoreProductController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public storefront API
|--------------------------------------------------------------------------
|
| Consumed by an external ecommerce site (e.g. the Lu Accesorios storefront
| — see LU_ACCESORIOS_STOREFRONT_PLAN.md / ECOMMERCE_API_PLAN.md), never by
| this app's own panel. Authenticated by a per-tenant API key
| (ResolveTenantFromApiKey), not a session — see that middleware's docblock
| for why it can't reuse IdentifyTenant.
|
| Registered via bootstrap/app.php's `api:` router param, which auto-applies
| the stateless `api` middleware group and prefixes every route here with
| `/api` — so `v1/store/products` below resolves to `/api/v1/store/products`.
|
| Versioned from day one (`v1`) even with a single version today, so the
| contract can change later without breaking whatever already integrated
| against it.
|
| Read-only by design (Fase 1 of ECOMMERCE_API_PLAN.md) — no route here
| creates or mutates anything. A future "create order" endpoint is a
| deliberately separate, much more carefully guarded addition (Fase 2),
| not an extension of this file's surface.
*/
Route::middleware(['store.api.key', 'throttle:store-api'])->prefix('v1/store')->name('api.store.')->group(function () {
    Route::get('info', [StoreInfoController::class, 'show'])->name('info');
    Route::get('categories', [StoreCategoryController::class, 'index'])->name('categories.index');
    Route::get('branches', [StoreBranchController::class, 'index'])->name('branches.index');
    Route::get('payment-methods', [StorePaymentMethodController::class, 'index'])->name('payment-methods.index');
    Route::get('products', [StoreProductController::class, 'index'])->name('products.index');
    Route::get('products/{slug}', [StoreProductController::class, 'show'])->name('products.show');
});
