<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Arriendo',           'icon' => 'Home',         'color' => 'blue',   'is_system' => true],
            ['name' => 'Nómina',             'icon' => 'Users',        'color' => 'purple', 'is_system' => true],
            ['name' => 'Servicios públicos', 'icon' => 'Zap',          'color' => 'yellow', 'is_system' => true],
            ['name' => 'Internet / Teléfono', 'icon' => 'Wifi',         'color' => 'cyan',   'is_system' => true],
            ['name' => 'Marketing',          'icon' => 'Megaphone',    'color' => 'pink',   'is_system' => true],
            ['name' => 'Transporte',         'icon' => 'Truck',        'color' => 'orange', 'is_system' => true],
            ['name' => 'Mantenimiento',      'icon' => 'Wrench',       'color' => 'gray',   'is_system' => true],
            ['name' => 'Impuestos',          'icon' => 'Landmark',     'color' => 'red',    'is_system' => true],
            ['name' => 'Otros',              'icon' => 'MoreHorizontal', 'color' => 'slate',  'is_system' => true],
        ];

        foreach ($categories as $category) {
            ExpenseCategory::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
