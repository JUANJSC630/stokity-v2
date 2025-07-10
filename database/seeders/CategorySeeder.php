<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $names = [
            'Bebidas', 'Lácteos', 'Carnes', 'Frutas', 'Verduras',
            'Aseo', 'Panadería', 'Dulces', 'Electrodomésticos', 'Ropa'
        ];
        foreach ($names as $name) {
            Category::firstOrCreate([
                'name' => $name
            ], [
                'description' => 'Categoría de ' . strtolower($name),
                'status' => true,
            ]);
        }
    }
}
