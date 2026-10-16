<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignProductTagsRequest;
use App\Http\Requests\ProductTagRequest;
use App\Models\Product;
use App\Models\ProductTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductTagController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('product-tags/index', [
            'tags' => ProductTag::query()->withCount('products')->orderBy('name')->get(['id', 'name', 'slug']),
            'maxPerProduct' => ProductTag::MAX_PER_PRODUCT,
        ]);
    }

    public function store(ProductTagRequest $request): RedirectResponse
    {
        ProductTag::create($request->validated());

        return back()->with('success', 'Etiqueta creada');
    }

    public function update(ProductTagRequest $request, ProductTag $productTag): RedirectResponse
    {
        $productTag->update($request->validated());

        return back()->with('success', 'Etiqueta actualizada');
    }

    /**
     * Deleting a tag only removes it from the products that carried it; the
     * products themselves are untouched (apart from their updated_at).
     */
    public function destroy(ProductTag $productTag): RedirectResponse
    {
        abort_unless(request()->user()->can('products.update'), 403, 'No tienes permisos para eliminar etiquetas.');

        $productTag->delete();

        return back()->with('success', 'Etiqueta eliminada');
    }

    /**
     * Adds or removes ONE tag on many products at once. All-or-nothing: if
     * any product would exceed the per-product tag limit, nothing changes.
     */
    public function assign(AssignProductTagsRequest $request): RedirectResponse
    {
        $user = $request->user();
        $tag = ProductTag::findOrFail($request->integer('tag_id'));

        $products = Product::query()
            ->whereIn('id', $request->input('product_ids'))
            ->withCount('tags')
            ->get();

        abort_if(
            $user->isRestrictedToOwnBranch() && $products->contains(fn (Product $p) => $p->branch_id !== $user->branch_id),
            403,
            'Solo puedes etiquetar productos de tu sucursal.',
        );

        $adding = $request->input('action') === 'add';
        $alreadyTagged = $tag->products()->whereIn('products.id', $products->pluck('id'))->pluck('products.id');

        $targets = $adding
            ? $products->reject(fn (Product $p) => $alreadyTagged->contains($p->id))
            : $products->filter(fn (Product $p) => $alreadyTagged->contains($p->id));

        if ($adding) {
            $overLimit = $targets->filter(fn (Product $p) => $p->tags_count >= ProductTag::MAX_PER_PRODUCT);

            if ($overLimit->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'product_ids' => 'Estos productos ya tienen '.ProductTag::MAX_PER_PRODUCT.' etiquetas: '.$overLimit->pluck('name')->take(5)->implode(', ').'. No se cambió nada.',
                ]);
            }
        }

        DB::transaction(function () use ($targets, $tag, $adding) {
            $ids = $targets->pluck('id')->all();

            $adding ? $tag->products()->attach($ids) : $tag->products()->detach($ids);

            Product::query()->whereIn('id', $ids)->update(['updated_at' => now()]);
        });

        $count = $targets->count();
        $verb = $adding ? 'agregada a' : 'quitada de';

        return back()->with('success', "Etiqueta {$verb} {$count} producto".($count === 1 ? '' : 's'));
    }
}
