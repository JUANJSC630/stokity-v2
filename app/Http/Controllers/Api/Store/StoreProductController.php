<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreProductResource;
use App\Models\Product;
use App\Models\TenantApiKey;
use App\Rules\ExistingHttpsBlobUrl;
use Carbon\CarbonImmutable;
use Closure;
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
            'per_page' => 'nullable|integer|min:1|max:100',
            'visibility' => 'nullable|string|in:all',
            'tag' => 'nullable|string|max:200',
            'updated_since' => ['nullable', 'string', function (string $attribute, mixed $value, Closure $fail) {
                if ($this->parseUpdatedSince((string) $value) === null) {
                    $fail('El parámetro updated_since debe ser una fecha ISO 8601, por ejemplo 2026-10-16T14:03:22-05:00 (codifica el + como %2B en la URL).');
                }
            }],
        ]);

        $since = $request->filled('updated_since') ? $this->parseUpdatedSince($request->string('updated_since')->value()) : null;

        $showAll = $request->query('visibility') === 'all' && $this->canManageMedia($request);

        if ($since !== null) {
            $syncedAt = now();
            $request->attributes->set('storeSyncMode', true);

            $query = Product::query()
                ->withTrashed()
                ->where('updated_at', '>=', $since)
                // Visible products, plus anything that was ever curated (has
                // a slug) and has since been hidden or deleted — those the
                // storefront must be told to take down. A product that never
                // reached the storefront has no slug and stays out.
                ->where(fn ($q) => $q
                    ->where(fn ($visible) => $visible->where('status', true)->where('show_in_storefront', true))
                    ->orWhereNotNull('slug'))
                ->with(Product::STORE_RELATIONS)
                ->orderBy('updated_at')
                ->orderBy('id');
        } else {
            $query = Product::query()
                ->where('status', true)
                ->when(! $showAll, fn ($q) => $q->where('show_in_storefront', true))
                ->with(Product::STORE_RELATIONS)
                ->orderBy('name');
        }

        if ($request->filled('q')) {
            $query->where('name', 'like', '%'.$this->escapeLike($request->string('q')->value()).'%');
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }

        // `?tag=a,b` matches products carrying ANY of the listed tags.
        if ($request->filled('tag')) {
            $slugs = collect(explode(',', $request->string('tag')->value()))->map(fn (string $slug) => trim($slug))->filter()->take(10)->all();

            $query->whereHas('tags', fn ($tags) => $tags->whereIn('product_tags.slug', $slugs));
        }

        $products = $query->paginate($request->integer('per_page', 24));

        $collection = StoreProductResource::collection($products);

        if (isset($syncedAt)) {
            $collection->additional(['meta' => ['synced_at' => $syncedAt->toIso8601String()]]);
        }

        return $collection;
    }

    /**
     * Parses `updated_since` (ISO 8601, with or without zone) into the app
     * timezone, which is how `updated_at` is stored. A "+" in a query string
     * decodes to a space, so "…22 05:00" is read as "…22+05:00" — a client
     * that forgot to URL-encode its offset still gets the right instant.
     */
    private function parseUpdatedSince(string $value): ?CarbonImmutable
    {
        $value = trim($value);
        $value = preg_replace('/(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?) (\d{2}:?\d{2})$/', '$1+$2', $value);

        $iso8601 = '/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/';

        if (! preg_match($iso8601, $value)) {
            return null;
        }

        try {
            return CarbonImmutable::parse($value)->setTimezone(config('app.timezone'));
        } catch (\Throwable) {
            return null;
        }
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
            ->with(Product::STORE_RELATIONS)
            ->firstOrFail();

        return new StoreProductResource($product);
    }

    /**
     * Updates storefront curation and/or the cover photo for a product,
     * addressed by slug OR code (Product::findActiveForStoreApi()) — a
     * product only gets a slug the first time it's curated, so code is what
     * makes it possible to activate one for the very first time, the main
     * use case of this write surface, not an edge case. Gated by
     * `can_manage_media` at the route level (routes/api.php), not here.
     *
     * Both fields are optional but at least one is required
     * (`required_without` on each) — an empty PATCH is a client bug, not a
     * meaningful no-op worth silently accepting.
     *
     * `image_url` replaces Product::$image directly, the same "just point
     * at a URL the storefront already uploaded to its own Blob" idea as
     * POST .../images — never BlobStorageService, never a file upload.
     * Deliberately NOT required to already be one of the product's gallery
     * images: a storefront may want a cover shot that never goes in the
     * gallery at all.
     *
     * Deliberately does NOT filter by show_in_storefront when looking the
     * product up — unlike show()/index(), which exist to show only what's
     * already public. Toggling that flag (this endpoint's original purpose)
     * requires being able to reach a product that isn't public yet, so
     * requiring it to already be true would make un-hiding (or first
     * curating) a product impossible.
     */
    public function update(Request $request, string $identifier): StoreProductResource
    {
        $validated = $request->validate([
            'show_in_storefront' => 'required_without:image_url|boolean',
            'image_url' => [
                'required_without:show_in_storefront',
                'string',
                'max:2048',
                'url',
                new ExistingHttpsBlobUrl,
            ],
        ]);

        $product = Product::findActiveForStoreApi($identifier);

        if (array_key_exists('show_in_storefront', $validated)) {
            $product->show_in_storefront = $validated['show_in_storefront'];
        }

        if (array_key_exists('image_url', $validated)) {
            $product->image = $validated['image_url'];
        }

        $product->save();

        return new StoreProductResource($product->load(Product::STORE_RELATIONS));
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
