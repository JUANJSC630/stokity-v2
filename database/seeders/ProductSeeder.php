<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = Branch::all();
        $categorias = Category::all();
        $productosPorCategoria = [
            'Bebidas' => ['Agua Cristal', 'Colombiana', 'Postobón', 'Aguila', 'Poker', 'Manzana', 'Hit Naranja', 'Hit Mango', 'Coca-Cola', 'Pepsi'],
            'Lácteos' => ['Alpina Yogurt', 'Colanta Leche', 'Alquería Kumis', 'Colanta Queso', 'Alpina Kumis', 'Colanta Yogurt', 'Alquería Leche', 'Alpina Queso', 'Colanta Mantequilla', 'Alpina Arequipe'],
            'Carnes' => ['Res Bandeja', 'Pollo Entero', 'Costilla Cerdo', 'Chorizo Santarrosano', 'Morcilla', 'Pechuga Pollo', 'Carne Molida', 'Lomo Cerdo', 'Chicharrón', 'Salchicha Ranchera'],
            'Frutas' => ['Banano', 'Mango Tommy', 'Papaya', 'Piña', 'Sandía', 'Guanábana', 'Lulo', 'Maracuyá', 'Guayaba', 'Uva Isabela'],
            'Verduras' => ['Papa Pastusa', 'Cebolla Larga', 'Tomate Chonto', 'Zanahoria', 'Lechuga Batavia', 'Aguacate Hass', 'Repollo', 'Cilantro', 'Ajo', 'Remolacha'],
            'Aseo' => ['Jabón Rey', 'Detergente Fab', 'Suavitel', 'Clorox', 'Lysol', 'Ariel', 'Axion', 'Escoba', 'Trapeador', 'Esponja'],
            'Panadería' => ['Pan Aliñado', 'Pan Blandito', 'Pan Queso', 'Pan Coco', 'Pan Integral', 'Pan Tajado', 'Pan Rollo', 'Pan Croissant', 'Pan Baguette', 'Pan Pandebono'],
            'Dulces' => ['Chocoramo', 'Bon Bon Bum', 'Jet', 'Nucita', 'Bianchi', 'Trululu', 'Gomitas', 'Supercoco', 'Cocosette', 'Chocman'],
            'Electrodomésticos' => ['Licuadora Oster', 'Sanduchera Imusa', 'Plancha Universal', 'Ventilador Kalley', 'Microondas Haceb', 'Nevera Challenger', 'Estufa Haceb', 'Freidora de Aire', 'Cafetera Oster', 'Aspiradora Electrolux'],
            'Ropa' => ['Camiseta Polo', 'Jean Levantacola', 'Sudadera Deportiva', 'Pantaloneta', 'Blusa Manga Larga', 'Vestido de Baño', 'Chaqueta Impermeable', 'Medias Tobilleras', 'Camiseta Selección', 'Gorra Trucker'],
        ];
        foreach ($categorias as $categoria) {
            $nombres = $productosPorCategoria[$categoria->name] ?? [];
            foreach ($nombres as $nombre) {
                // Función para limpiar caracteres especiales y generar códigos seguros
                $cleanName = iconv('UTF-8', 'ASCII//TRANSLIT', $nombre);
                $cleanName = preg_replace('/[^A-Za-z0-9]/', '', $cleanName);
                $cleanCategory = iconv('UTF-8', 'ASCII//TRANSLIT', $categoria->name);
                $cleanCategory = preg_replace('/[^A-Za-z0-9]/', '', $cleanCategory);
                
                // Generar código único (puede ser numérico o alfanumérico)
                $codeOptions = [
                    // Opción 1: Código numérico de 8 dígitos
                    str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    // Opción 2: Código alfanumérico con prefijo (caracteres seguros)
                    strtoupper(substr($cleanName, 0, 3)) . '-' . rand(1000, 9999),
                    // Opción 3: Código con categoría (caracteres seguros)
                    strtoupper(substr($cleanCategory, 0, 3)) . '-' . rand(10000, 99999),
                ];
                
                $code = $codeOptions[array_rand($codeOptions)];
                
                // Verificar que el código sea único
                while (Product::where('code', $code)->exists()) {
                    $code = $codeOptions[array_rand($codeOptions)];
                }

                // Precios realistas por categoría según mercado colombiano 2025
                $preciosPorProducto = [];
                
                // Asignar precios específicos para cada producto
                if ($categoria->name == 'Bebidas') {
                    $preciosPorProducto = [
                        'Agua Cristal' => [2000, 3000, 0],  // Agua embotellada: exenta
                        'Colombiana' => [2500, 4000, 19],
                        'Postobón' => [2500, 4000, 19],
                        'Aguila' => [2500, 4000, 19],
                        'Poker' => [2500, 4000, 19],
                        'Manzana' => [2500, 4000, 19],
                        'Hit Naranja' => [3000, 4500, 19],
                        'Hit Mango' => [3000, 4500, 19],
                        'Coca-Cola' => [3500, 5000, 19],
                        'Pepsi' => [3000, 4500, 19],
                    ];
                } elseif ($categoria->name == 'Lácteos') {
                    $preciosPorProducto = [
                        'Alpina Yogurt' => [4000, 6000, 5],
                        'Colanta Leche' => [3000, 4500, 0], // Leche líquida: exenta
                        'Alquería Kumis' => [4000, 6000, 5],
                        'Colanta Queso' => [8000, 12000, 5],
                        'Alpina Kumis' => [4000, 6000, 5],
                        'Colanta Yogurt' => [4000, 6000, 5],
                        'Alquería Leche' => [3000, 4500, 0], // Leche líquida: exenta
                        'Alpina Queso' => [8000, 12000, 5],
                        'Colanta Mantequilla' => [6000, 9000, 5],
                        'Alpina Arequipe' => [5000, 7500, 19],
                    ];
                } elseif ($categoria->name == 'Carnes') {
                    $preciosPorProducto = [
                        'Res Bandeja' => [18000, 25000, 0], // Carnes frescas: exentas
                        'Pollo Entero' => [15000, 22000, 0],
                        'Costilla Cerdo' => [16000, 23000, 0],
                        'Chorizo Santarrosano' => [12000, 18000, 5], // Embutidos: 5%
                        'Morcilla' => [8000, 12000, 5],
                        'Pechuga Pollo' => [13000, 19000, 0],
                        'Carne Molida' => [14000, 20000, 0],
                        'Lomo Cerdo' => [17000, 24000, 0],
                        'Chicharrón' => [12000, 18000, 0],
                        'Salchicha Ranchera' => [9000, 14000, 5],
                    ];
                } elseif ($categoria->name == 'Frutas') {
                    $preciosPorProducto = [
                        'Banano' => [2000, 3000, 0],
                        'Mango Tommy' => [3000, 4500, 0],
                        'Papaya' => [4000, 6000, 0],
                        'Piña' => [4000, 6000, 0],
                        'Sandía' => [6000, 9000, 0],
                        'Guanábana' => [7000, 10000, 0],
                        'Lulo' => [4000, 6000, 0],
                        'Maracuyá' => [3000, 4500, 0],
                        'Guayaba' => [2000, 3000, 0],
                        'Uva Isabela' => [5000, 7500, 0],
                    ];
                } elseif ($categoria->name == 'Verduras') {
                    $preciosPorProducto = [
                        'Papa Pastusa' => [2000, 3000, 0],
                        'Cebolla Larga' => [1500, 2500, 0],
                        'Tomate Chonto' => [3000, 4500, 0],
                        'Zanahoria' => [2000, 3000, 0],
                        'Lechuga Batavia' => [2500, 4000, 0],
                        'Aguacate Hass' => [5000, 7500, 0],
                        'Repollo' => [2000, 3000, 0],
                        'Cilantro' => [1000, 2000, 0],
                        'Ajo' => [2000, 3000, 0],
                        'Remolacha' => [2000, 3000, 0],
                    ];
                } elseif ($categoria->name == 'Aseo') {
                    $preciosPorProducto = [
                        'Jabón Rey' => [3000, 4500, 19],
                        'Detergente Fab' => [8000, 12000, 19],
                        'Suavitel' => [10000, 15000, 19],
                        'Clorox' => [5000, 7500, 19],
                        'Lysol' => [12000, 18000, 19],
                        'Ariel' => [15000, 22000, 19],
                        'Axion' => [6000, 9000, 19],
                        'Escoba' => [8000, 12000, 19],
                        'Trapeador' => [10000, 15000, 19],
                        'Esponja' => [3000, 4500, 19],
                    ];
                } elseif ($categoria->name == 'Panadería') {
                    $preciosPorProducto = [
                        'Pan Aliñado' => [1000, 2000, 0],
                        'Pan Blandito' => [1000, 2000, 0],
                        'Pan Queso' => [2000, 3000, 0],
                        'Pan Coco' => [2000, 3000, 0],
                        'Pan Integral' => [2500, 4000, 0],
                        'Pan Tajado' => [4000, 6000, 0],
                        'Pan Rollo' => [1500, 2500, 0],
                        'Pan Croissant' => [2500, 4000, 0],
                        'Pan Baguette' => [3000, 4500, 0],
                        'Pan Pandebono' => [1500, 2500, 0],
                    ];
                } elseif ($categoria->name == 'Dulces') {
                    $preciosPorProducto = [
                        'Chocoramo' => [2000, 3000, 19],
                        'Bon Bon Bum' => [500, 1000, 19],
                        'Jet' => [1000, 2000, 19],
                        'Nucita' => [1500, 2500, 19],
                        'Bianchi' => [500, 1000, 19],
                        'Trululu' => [2000, 3000, 19],
                        'Gomitas' => [2500, 4000, 19],
                        'Supercoco' => [500, 1000, 19],
                        'Cocosette' => [1500, 2500, 19],
                        'Chocman' => [1500, 2500, 19],
                    ];
                } elseif ($categoria->name == 'Electrodomésticos') {
                    $preciosPorProducto = [
                        'Licuadora Oster' => [180000, 250000, 19],
                        'Sanduchera Imusa' => [80000, 120000, 19],
                        'Plancha Universal' => [70000, 100000, 19],
                        'Ventilador Kalley' => [90000, 130000, 19],
                        'Microondas Haceb' => [300000, 420000, 19],
                        'Nevera Challenger' => [800000, 1200000, 19],
                        'Estufa Haceb' => [500000, 700000, 19],
                        'Freidora de Aire' => [250000, 350000, 19],
                        'Cafetera Oster' => [150000, 220000, 19],
                        'Aspiradora Electrolux' => [350000, 500000, 19],
                    ];
                } elseif ($categoria->name == 'Ropa') {
                    $preciosPorProducto = [
                        'Camiseta Polo' => [50000, 75000, 19],
                        'Jean Levantacola' => [80000, 120000, 19],
                        'Sudadera Deportiva' => [60000, 90000, 19],
                        'Pantaloneta' => [40000, 60000, 19],
                        'Blusa Manga Larga' => [55000, 80000, 19],
                        'Vestido de Baño' => [70000, 100000, 19],
                        'Chaqueta Impermeable' => [100000, 150000, 19],
                        'Medias Tobilleras' => [15000, 25000, 19],
                        'Camiseta Selección' => [90000, 130000, 19],
                        'Gorra Trucker' => [35000, 50000, 19],
                    ];
                }
                
                // Si el producto está en la lista de precios específicos, usar esos valores
                if (isset($preciosPorProducto[$nombre])) {
                    $purchase = $preciosPorProducto[$nombre][0];
                    $sale = $preciosPorProducto[$nombre][1];
                    $tax = $preciosPorProducto[$nombre][2];
                } else {
                    // Para productos que no están en la lista, usar el método anterior
                    switch ($categoria->name) {
                        case 'Bebidas':
                        case 'Dulces':
                            $purchase = round(rand(800, 2500), -3);
                            $sale = round(rand($purchase + 200, $purchase + 1200), -3);
                            $tax = rand(0, 19);
                            break;
                        case 'Lácteos':
                        case 'Panadería':
                        case 'Frutas':
                        case 'Verduras':
                        case 'Aseo':
                            $purchase = round(rand(2000, 8000), -3);
                            $sale = round(rand($purchase + 500, $purchase + 3000), -3);
                            $tax = rand(0, 19);
                            break;
                        case 'Carnes':
                            $purchase = round(rand(8000, 25000), -3);
                            $sale = round(rand($purchase + 1000, $purchase + 7000), -3);
                            $tax = rand(0, 19);
                            break;
                        case 'Electrodomésticos':
                            $purchase = round(rand(70000, 350000), -3);
                            $sale = round(rand($purchase + 5000, $purchase + 40000), -3);
                            $tax = 19;
                            break;
                        case 'Ropa':
                            $purchase = round(rand(12000, 60000), -3);
                            $sale = round(rand($purchase + 2000, $purchase + 20000), -3);
                            $tax = 19;
                            break;
                        default:
                            $purchase = round(rand(1000, 50000), -3);
                            $sale = round(rand($purchase + 500, $purchase + 10000), -3);
                            $tax = rand(0, 19);
                    }
                }

                // Crear el producto en una sucursal aleatoria
                $branch = $branches->random();
                
                Product::firstOrCreate([
                    'name' => $nombre,
                    'category_id' => $categoria->id,
                ], [
                    'branch_id' => $branch->id,
                    'code' => $code,
                    'description' => 'Producto colombiano: ' . $nombre,
                    'purchase_price' => $purchase,
                    'sale_price' => $sale,
                    'tax' => $tax,
                    'stock' => rand(10, 100),
                    'min_stock' => rand(2, 10),
                    'status' => true,
                ]);
            }
        }
    }
}
