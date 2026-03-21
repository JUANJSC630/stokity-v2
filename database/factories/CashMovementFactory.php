<?php

namespace Database\Factories;

use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CashMovement> */
class CashMovementFactory extends Factory
{
    protected $model = CashMovement::class;

    public function definition(): array
    {
        return [
            'session_id' => CashSession::factory(),
            'user_id' => User::factory(),
            'type' => 'cash_in',
            'amount' => $this->faker->numberBetween(10000, 100000),
            'concept' => $this->faker->sentence(3),
            'notes' => null,
        ];
    }
}
