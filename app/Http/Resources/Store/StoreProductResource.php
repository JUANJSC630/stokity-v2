<?php

namespace App\Http\Resources\Store;

use App\Models\TenantApiKey;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public storefront shape of a Product. Deliberately an explicit allow-list,
 * never Product::all()->toJson() — `purchase_price` (internal cost),
 * `reserved_stock`, `min_stock` and every other panel-only field must never
 * reach here even if someone adds a column to Product later. `branch_id`
 * itself is not exposed either — only the sanitized `branch` relation
 * (StoreBranchResource), needed because Product rows are per-branch (see
 * StoreProductController's docblock).
 *
 * @mixin \App\Models\Product
 */
class StoreProductResource extends JsonResource
{
    public function toArray($request): array
    {
        $isSyncMode = (bool) $request->attributes->get('storeSyncMode');

        if ($isSyncMode && $this->trashed()) {
            return $this->deletedStub();
        }

        if ($isSyncMode && ! $this->isVisibleInStorefront()) {
            return $this->hiddenStub();
        }

        $isService = $this->isService();

        return [
            'code' => $this->code,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'price' => (float) $this->sale_price,
            'is_service' => $isService,
            // A service has unlimited "stock" (Product::availableStock()
            // returns PHP_INT_MAX for it) — that internal sentinel must
            // never reach a public response, so stock fields are only
            // meaningful for a physical product.
            'in_stock' => $isService ? true : $this->availableStock() > 0,
            // Exact count, not just in_stock, so a storefront can show
            // "solo quedan 2" — availableStock() already nets out reserved
            // stock so a pending sale never gets double-sold to the web.
            'available_stock' => $isService ? null : $this->availableStock(),
            'image_url' => $this->image_url,
            'gallery' => StoreProductImageResource::collection($this->whenLoaded('images')),
            'category' => $this->whenLoaded('category', fn () => new StoreCategoryResource($this->category)),
            'branch' => $this->whenLoaded('branch', fn () => new StoreBranchResource($this->branch)),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($tag) => ['slug' => $tag->slug, 'name' => $tag->name])->values()),
            // Curation state is panel-internal, not something a plain
            // read-only storefront integration needs — only a key allowed
            // to manage media/visibility (StoreProductController's
            // `?visibility=all` and PATCH endpoint) gets to see it, so it
            // can tell which of the products it just fetched are already
            // public versus still hidden.
            'show_in_storefront' => $this->when(
                $this->requestCanManageMedia($request),
                fn () => $this->show_in_storefront,
            ),
            // Facts Ley 1480 (art. 50) requires per piece, plus SEO copy. Always
            // present (null when the business hasn't filled them in).
            'material' => $this->material,
            'dimensions' => $this->dimensions,
            'weight_grams' => $this->weight_grams,
            'origin' => $this->origin,
            'manufacturing' => $this->manufacturing?->value,
            'care_instructions' => $this->care_instructions,
            'color' => $this->color,
            'style' => $this->style,
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // Only in `updated_since` mode, where it is how the storefront
            // learns which products to keep (true) or take down (false).
            'visible' => $this->when($isSyncMode, true),
        ];
    }

    private function isVisibleInStorefront(): bool
    {
        return $this->status && $this->show_in_storefront;
    }

    /**
     * What `updated_since` returns for a product that was soft-deleted: just
     * enough to remove it from the storefront — nothing else about it.
     *
     * @return array<string, mixed>
     */
    private function deletedStub(): array
    {
        return [
            'code' => $this->code,
            'slug' => $this->slug,
            'deleted' => true,
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * What `updated_since` returns for a product that stopped being public
     * (deactivated or un-curated). Deliberately NOT the full product: price
     * and stock of an item the business chose to keep off the public site
     * must not leak just because it changed.
     *
     * @return array<string, mixed>
     */
    private function hiddenStub(): array
    {
        return [
            'code' => $this->code,
            'slug' => $this->slug,
            'visible' => false,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function requestCanManageMedia($request): bool
    {
        /** @var TenantApiKey|null $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        return (bool) $apiKey?->can_manage_media;
    }
}
