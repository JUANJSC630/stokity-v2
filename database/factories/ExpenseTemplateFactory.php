<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\ExpenseTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ExpenseTemplate> */
class ExpenseTemplateFactory extends Factory
{
    protected $model = ExpenseTemplate::class;

    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'expense_category_id' => null,
            'name' => $this->faker->randomElement(['Arriendo local', 'Factura EPM', 'Internet', 'Nómina empleada']),
            'reference_amount' => $this->faker->numberBetween(50000, 2000000),
            'is_active' => true,
        ];
    }
}
