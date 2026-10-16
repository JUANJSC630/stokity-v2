<?php

namespace Database\Factories;

use App\Models\ProductTag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductTag>
 */
class ProductTagFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->word()),
        ];
    }
}
