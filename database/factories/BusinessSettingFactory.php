<?php

namespace Database\Factories;

use App\Models\BusinessSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BusinessSetting> */
class BusinessSettingFactory extends Factory
{
    protected $model = BusinessSetting::class;

    public function definition(): array
    {
        return [
            'name'                 => 'Stokity Test',
            'currency_symbol'      => '$',
            'require_cash_session' => false,
        ];
    }
}
