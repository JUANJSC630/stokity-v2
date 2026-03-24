<?php

namespace Database\Factories;

use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ExpenseCategory> */
class ExpenseCategoryFactory extends Factory
{
    protected $model = ExpenseCategory::class;

    public function definition(): array
    {
        return [
            'name'      => $this->faker->randomElement(['Arriendo', 'Nómina', 'Servicios públicos', 'Marketing', 'Transporte', 'Otros']),
            'icon'      => 'Home',
            'color'     => 'blue',
            'is_system' => false,
        ];
    }
}
