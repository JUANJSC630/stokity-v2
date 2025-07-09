<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener todas las sucursales y categorías activas
        $branches = Branch::where('status', true)->get();
        $categories = Category::where('status', true)->get();
        
        // Verificar si hay suficientes datos para continuar
        if ($branches->isEmpty() || $categories->isEmpty()) {
            $this->command->info('No hay sucursales o categorías activas. Ejecuta primero los seeders correspondientes.');
            return;
        }

        // Eliminar productos existentes para evitar duplicados
        Product::truncate();
        $this->command->info('Se han eliminado todos los productos existentes.');
        
        // Para cada sucursal
        foreach ($branches as $branch) {
            // Para cada categoría
            foreach ($categories as $category) {
                // Crear entre 5-10 productos activos por categoría y sucursal
                $productsCount = rand(5, 10);
                for ($i = 0; $i < $productsCount; $i++) {
                    Product::factory()
                        ->state([
                            'category_id' => $category->id,
                            'branch_id' => $branch->id,
                            'status' => true,
                        ])
                        ->create();
                }
                
                // Crear 1-2 productos con stock bajo
                $lowStockCount = rand(1, 2);
                for ($i = 0; $i < $lowStockCount; $i++) {
                    Product::factory()
                        ->state([
                            'category_id' => $category->id,
                            'branch_id' => $branch->id,
                            'status' => true,
                        ])
                        ->lowStock()
                        ->create();
                }
                
                // Crear 1 producto inactivo
                Product::factory()
                    ->state([
                        'category_id' => $category->id,
                        'branch_id' => $branch->id,
                    ])
                    ->inactive()
                    ->create();
            }
        }
        
        $this->command->info('Se han creado ' . Product::count() . ' productos en total.');
    }
}
