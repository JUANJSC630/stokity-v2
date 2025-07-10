<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $net = $this->faker->randomFloat(2, 10, 1000);
        $tax = $net * 0.19; // 19% de impuesto como ejemplo
        $total = $net + $tax;
        
        $paymentMethods = ['cash', 'credit_card', 'debit_card', 'transfer', 'other'];

        return [
            'branch_id' => Branch::inRandomOrder()->first()->id ?? Branch::factory(),
            'code' => 'SALE-' . $this->faker->unique()->numerify('######'),
            'client_id' => Client::inRandomOrder()->first()->id ?? Client::factory(),
            'seller_id' => User::inRandomOrder()->first()->id ?? User::factory(),
            'tax' => $tax,
            'net' => $net,
            'total' => $total,
            'payment_method' => $this->faker->randomElement($paymentMethods),
            'date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'status' => $this->faker->randomElement(['completed', 'pending', 'cancelled']),
        ];
    }
}
