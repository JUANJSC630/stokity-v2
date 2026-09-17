<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreCategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoreCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        // Both conditions must mirror StoreProductController's own
        // visibility rule exactly — otherwise a category can list here with
        // zero products actually visible at GET .../products?category_id=X
        // (e.g. a curated product later deactivated in the panel without
        // being un-curated), a dead end in the storefront's nav.
        $categories = Category::where('status', true)
            ->whereHas('products', fn ($q) => $q->where('show_in_storefront', true)->where('status', true))
            ->orderBy('name')
            ->get();

        return StoreCategoryResource::collection($categories);
    }
}
