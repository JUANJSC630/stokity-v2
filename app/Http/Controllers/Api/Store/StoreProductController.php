<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreProductResource;
use App\Models\Product;
use App\Models\TenantApiKey;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoreProductController extends Controller
{
    /**
     * Catalog for the storefront. Both `status` (panel-level active/inactive)
     * and `show_in_storefront` (public-visibility curation) are required —
     * a product can be active in the POS but deliberately kept off the
     * public site (raw materials, wholesale-only items, long-out-of-stock).
     *
     * `?visibility=all` lifts the `show_in_storefront` requirement — but
     * only for a key with `can_manage_media` — so a storefront's admin tool
     * can list not-yet-curated products to decide what to publish. A plain
     * read-only key passing this param gets silently ignored, never a 403:
     * it's an additive capability, not something worth failing a normal
     * catalog request over.
     *
     * Products are per-branch rows throughout this app (see
     * ProductController — every panel query scopes by branch_id), not a
     * single tenant-wide catalog. A multi-branch tenant that curates the
     * "same" item at two branches gets two separate Product rows here too,
     * each reporting only its own branch's stock — StoreProductResource
     * exposes `branch` so the storefront can tell them apart (or filter to
     * one via `branch_id` below) instead of silently looking like a
     * duplicate or double-counting stock. Merging stock across branches
     * into one storefront listing is a bigger feature, deliberately not
     * attempted here.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'q' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'branch_id' => 'nullable|integer',
            'per_page' => 'nullable|integer|min:1|max:50',
            'visibility' => 'nullable|string|in:all',
        ]);

        $showAll = $request->query('visibility') === 'all' && $this->canManageMedia($request);

        $query = Product::query()
            ->where('status', true)
            ->when(! $showAll, fn ($q) => $q->where('show_in_storefront', true))
            ->with(['category', 'images', 'branch'])
            ->orderBy('name');

        if ($request->filled('q')) {
            $query->where('name', 'like', '%'.$this->escapeLike($request->string('q')->value()).'%');
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }

        $products = $query->paginate($request->integer('per_page', 24));

        return StoreProductResource::collection($products);
    }

    /**
     * `$slug` is also matched against `code` when `$showAll` — a storefront
     * admin screen calls this to preview a product (name, category, branch,
     * current gallery) BEFORE deciding to curate it, and a never-curated
     * product has no slug yet (same reason as
     * Product::findActiveForStoreApi(), which the write endpoints use).
     * Without this, the write endpoints could already address such a
     * product by code while this read endpoint 404'd on the exact same
     * value. The public path (no `?visibility=all`, or a key without
     * `can_manage_media`) is untouched — slug-only, as before.
     */
    public function show(Request $request, string $slug): StoreProductResource
    {
        $showAll = $request->query('visibility') === 'all' && $this->canManageMedia($request);

        $product = Product::query()
            ->where('status', true)
            ->when(! $showAll, fn ($q) => $q->where('show_in_storefront', true))
            ->where(function ($query) use ($slug, $showAll) {
                $query->where('slug', $slug);

                if ($showAll) {
                    $query->orWhere('code', $slug);
                }
            })
            ->with(['category', 'images', 'branch'])
            ->firstOrFail();

        return new StoreProductResource($product);
    }

    /**
     * Toggles storefront curation for a product, addressed by slug OR code
     * (Product::findActiveForStoreApi()) — a product only gets a slug the
     * first time it's curated, so code is what makes it possible to
     * activate one for the very first time, the main use case of this
     * write surface, not an edge case. Gated by `can_manage_media` at the
     * route level (routes/api.php), not here.
     *
     * Deliberately does NOT filter by show_in_storefront when looking the
     * product up — unlike show()/index(), which exist to show only what's
     * already public. This endpoint's entire purpose is to flip that flag,
     * so requiring it to already be true would make un-hiding (or first
     * curating) a product impossible.
     */
    public function updateVisibility(Request $request, string $identifier): StoreProductResource
    {
        $validated = $request->validate([
            'show_in_storefront' => 'required|boolean',
        ]);

        $product = Product::findActiveForStoreApi($identifier);

        $product->update(['show_in_storefront' => $validated['show_in_storefront']]);

        return new StoreProductResource($product->load(['category', 'images', 'branch']));
    }

    private function canManageMedia(Request $request): bool
    {
        /** @var TenantApiKey|null $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        return (bool) $apiKey?->can_manage_media;
    }

    /**
     * Escapes LIKE metacharacters (MySQL's default LIKE escape char is
     * backslash) so a search for a product literally named e.g. "50%_off"
     * matches that literal string instead of "%"/"_" acting as wildcards.
     */
    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
