<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Supplier> */
class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'branch_id'    => Branch::factory(),
            'name'         => $this->faker->company(),
            'nit'          => $this->faker->numerify('##########'),
            'contact_name' => $this->faker->name(),
            'phone'        => $this->faker->phoneNumber(),
            'email'        => $this->faker->safeEmail(),
            'address'      => $this->faker->address(),
            'status'       => true,
        ];
    }
}
