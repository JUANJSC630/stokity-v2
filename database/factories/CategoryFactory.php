<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Category;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        static $names = [
            'Bebidas', 'Lácteos', 'Carnes', 'Frutas', 'Verduras',
            'Aseo', 'Panadería', 'Dulces', 'Electrodomésticos', 'Ropa'
        ];
        static $index = 0;
        $name = $names[$index % count($names)];
        $index++;
        return [
            'name' => $name,
            'description' => 'Categoría de ' . strtolower($name),
            'status' => true,
        ];
    }
}
