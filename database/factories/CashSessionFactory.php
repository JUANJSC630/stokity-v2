<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CashSession> */
class CashSessionFactory extends Factory
{
    protected $model = CashSession::class;

    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'opened_by_user_id' => User::factory(),
            'status' => 'open',
            'opening_amount' => 100000,
            'opened_at' => now(),
        ];
    }

    public function open(): static
    {
        return $this->state(fn () => [
            'status' => 'open',
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'status' => 'closed',
            'closed_at' => now(),
            'closed_by_user_id' => User::factory(),
            'closing_amount_declared' => 100000,
            'expected_cash' => 100000,
            'discrepancy' => 0,
        ]);
    }
}
