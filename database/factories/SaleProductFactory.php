<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SaleProduct> */
class SaleProductFactory extends Factory
{
    protected $model = SaleProduct::class;

    public function definition(): array
    {
        $price    = $this->faker->numberBetween(5000, 100000);
        $quantity = $this->faker->numberBetween(1, 5);

        return [
            'sale_id'                 => Sale::factory(),
            'product_id'              => Product::factory(),
            'quantity'                => $quantity,
            'price'                   => $price,
            'purchase_price_snapshot' => null,
            'subtotal'                => $price * $quantity,
        ];
    }
}
