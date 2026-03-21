<?php

namespace Database\Factories;

use App\Models\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PaymentMethod> */
class PaymentMethodFactory extends Factory
{
    protected $model = PaymentMethod::class;

    public function definition(): array
    {
        return [
            'name'        => 'Efectivo',
            'code'        => 'cash',
            'description' => null,
            'is_active'   => true,
            'sort_order'  => 0,
        ];
    }
}
