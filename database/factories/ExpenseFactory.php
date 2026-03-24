<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Expense> */
class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'branch_id'           => Branch::factory(),
            'user_id'             => User::factory(),
            'expense_category_id' => null,
            'expense_template_id' => null,
            'amount'              => $this->faker->numberBetween(10000, 2000000),
            'description'         => $this->faker->sentence(3),
            'expense_date'        => $this->faker->dateTimeBetween('first day of this month', 'last day of this month')->format('Y-m-d'),
            'notes'               => null,
        ];
    }
}
