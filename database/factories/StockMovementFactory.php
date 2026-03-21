<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<StockMovement> */
class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition(): array
    {
        $previousStock = $this->faker->numberBetween(10, 100);
        $quantity      = $this->faker->numberBetween(1, 5);

        return [
            'product_id'     => Product::factory(),
            'user_id'        => User::factory(),
            'branch_id'      => Branch::factory(),
            'type'           => 'in',
            'quantity'        => $quantity,
            'previous_stock' => $previousStock,
            'new_stock'      => $previousStock + $quantity,
            'unit_cost'      => null,
            'reference'      => null,
            'notes'          => null,
            'movement_date'  => now(),
        ];
    }
}
