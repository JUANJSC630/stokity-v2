<?php

use App\Http\Controllers\Api\Store\StoreBranchController;
use App\Http\Controllers\Api\Store\StoreCategoryController;
use App\Http\Controllers\Api\Store\StoreInfoController;
use App\Http\Controllers\Api\Store\StoreOrderReferenceController;
use App\Http\Controllers\Api\Store\StorePaymentMethodController;
use App\Http\Controllers\Api\Store\StoreProductController;
use App\Http\Controllers\Api\Store\StoreProductImageController;
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
| creates or mutates business data (products, stock, orders). A future
| "create order" endpoint is a deliberately separate, much more carefully
| guarded addition (Fase 2), not an extension of this file's surface.
|
| The products/{identifier}/images pair and the visibility PATCH below are
| a narrow, deliberate exception: they only let the storefront attach/detach
| an image URL it already uploaded to its OWN Vercel Blob store, or flip a
| product's storefront curation flag — see StoreProductImageController's and
| StoreProductController::updateVisibility()'s docblocks. None of them touch
| this app's BlobStorageService, stock, price, or any other product field,
| so they don't reopen the Fase-1 read-only boundary the way a real write
| endpoint would. All three require the resolved key to have
| `can_manage_media = true` (EnsureStoreApiKeyCanManageMedia) — an explicit,
| opt-in scope that no key gets retroactively, see that middleware's
| docblock.
|
| `{identifier}` (not `{slug}`, unlike the read-only routes above) because
| a product only gets a slug the first time it's curated for the
| storefront — see Product::findActiveForStoreApi()'s docblock. These three
| routes resolve by slug OR code so a storefront can curate (activate,
| photograph) a product that has never been public before, which is their
| main use case, not an edge case.
|
| order-reference is a separate, unrelated write endpoint gated by its own
| independent scope (`can_generate_order_references`, checked by
| EnsureStoreApiKeyCanGenerateOrderReferences) — a key that can manage
| media does not automatically get this too. It creates nothing beyond a
| counter row: see StoreOrderReferenceController's docblock for why this
| repo still has no orders table for the storefront to write to.
*/
Route::middleware(['store.api.key', 'throttle:store-api'])->prefix('v1/store')->name('api.store.')->group(function () {
    Route::get('info', [StoreInfoController::class, 'show'])->name('info');
    Route::get('categories', [StoreCategoryController::class, 'index'])->name('categories.index');
    Route::get('branches', [StoreBranchController::class, 'index'])->name('branches.index');
    Route::get('payment-methods', [StorePaymentMethodController::class, 'index'])->name('payment-methods.index');
    Route::get('products', [StoreProductController::class, 'index'])->name('products.index');
    Route::get('products/{slug}', [StoreProductController::class, 'show'])->name('products.show');

    Route::middleware('store.api.manage_media')->group(function () {
        Route::post('products/{identifier}/images', [StoreProductImageController::class, 'store'])->name('products.images.store');
        Route::delete('products/{identifier}/images/{imageId}', [StoreProductImageController::class, 'destroy'])->name('products.images.destroy');
        Route::patch('products/{identifier}', [StoreProductController::class, 'updateVisibility'])->name('products.update-visibility');
    });

    Route::post('order-reference', [StoreOrderReferenceController::class, 'store'])
        ->middleware('store.api.generate_order_references')
        ->name('order-reference.store');
});
