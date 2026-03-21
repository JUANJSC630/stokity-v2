<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->branch   = Branch::factory()->create();
    $this->category = Category::factory()->create();
    BusinessSetting::factory()->create();
});

describe('Pessimistic Lock', function () {
    it('prevents overselling with pessimistic lock', function () {
        $product = Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'stock'       => 1,
            'tax'         => 0,
        ]);

        $results = collect(range(1, 2))->map(function () use ($product) {
            try {
                return DB::transaction(function () use ($product) {
                    $p = Product::lockForUpdate()->find($product->id);
                    if ($p->stock < 1) {
                        throw new \Exception('Sin stock');
                    }
                    $p->decrement('stock', 1);

                    return 'ok';
                });
            } catch (\Exception) {
                return 'fail';
            }
        });

        expect($results->filter(fn ($r) => $r === 'ok')->count())->toBe(1);
        expect($product->fresh()->stock)->toBe(0);
    });
});
