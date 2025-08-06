<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;

class StockMovementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = Product::all();
        $users = User::all();

        if ($products->isEmpty() || $users->isEmpty()) {
            $this->command->info('No hay productos o usuarios disponibles para crear movimientos de stock.');
            return;
        }

        $movementTypes = ['in', 'out', 'adjustment'];
        $references = [
            'Compra proveedor ABC',
            'Compra proveedor XYZ',
            'Ajuste de inventario',
            'Devolución de cliente',
            'Transferencia entre sucursales',
            'Merma por vencimiento',
            'Donación',
            'Promoción especial'
        ];

        foreach ($products as $product) {
            // Crear algunos movimientos de entrada inicial
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $users->random()->id,
                'branch_id' => $product->branch_id,
                'type' => 'in',
                'quantity' => rand(50, 200),
                'previous_stock' => 0,
                'new_stock' => rand(50, 200),
                'unit_cost' => $product->purchase_price * (rand(80, 120) / 100), // Variación del 20%
                'reference' => $references[array_rand($references)],
                'notes' => 'Stock inicial del producto',
                'movement_date' => now()->subDays(rand(30, 90)),
            ]);

            // Actualizar el stock del producto
            $product->update(['stock' => rand(50, 200)]);

            // Crear algunos movimientos adicionales
            $currentStock = $product->stock;
            for ($i = 0; $i < rand(3, 8); $i++) {
                $type = $movementTypes[array_rand($movementTypes)];
                $quantity = rand(5, 30);
                
                switch ($type) {
                    case 'in':
                        $newStock = $currentStock + $quantity;
                        break;
                    case 'out':
                        $newStock = max(0, $currentStock - $quantity);
                        break;
                    case 'adjustment':
                        $newStock = rand(10, 100);
                        $quantity = $newStock;
                        break;
                }

                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $users->random()->id,
                    'branch_id' => $product->branch_id,
                    'type' => $type,
                    'quantity' => $quantity,
                    'previous_stock' => $currentStock,
                    'new_stock' => $newStock,
                    'unit_cost' => $type === 'in' ? $product->purchase_price * (rand(80, 120) / 100) : null,
                    'reference' => $references[array_rand($references)],
                    'notes' => 'Movimiento de stock generado automáticamente',
                    'movement_date' => now()->subDays(rand(1, 29)),
                ]);

                $currentStock = $newStock;
            }

            // Actualizar el stock final del producto
            $product->update(['stock' => $currentStock]);
        }

        $this->command->info('Movimientos de stock creados exitosamente.');
    }
}
