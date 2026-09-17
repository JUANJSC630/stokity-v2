<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreProductResource;
use App\Models\Product;
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
        ]);

        $query = Product::query()
            ->where('status', true)
            ->where('show_in_storefront', true)
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

    public function show(string $slug): StoreProductResource
    {
        $product = Product::query()
            ->where('status', true)
            ->where('show_in_storefront', true)
            ->where('slug', $slug)
            ->with(['category', 'images', 'branch'])
            ->firstOrFail();

        return new StoreProductResource($product);
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
