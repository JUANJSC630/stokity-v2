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
                $branch = $branches->first(); // Solo la primera sucursal
                if ($branch) {
                    $asciiName = iconv('UTF-8', 'ASCII//TRANSLIT', $nombre);
                    $asciiName = preg_replace('/[^A-Za-z0-9]/', '', $asciiName);
                    $code = strtoupper(substr($asciiName,0,3)) . $branch->id . $categoria->id . rand(100,999);

                    // Precios realistas por categoría
                    switch ($categoria->name) {
                        case 'Bebidas':
                        case 'Dulces':
                            $purchase = rand(800, 2500);
                            $sale = rand($purchase + 200, $purchase + 1200);
                            break;
                        case 'Lácteos':
                        case 'Panadería':
                        case 'Frutas':
                        case 'Verduras':
                        case 'Aseo':
                            $purchase = rand(2000, 8000);
                            $sale = rand($purchase + 500, $purchase + 3000);
                            break;
                        case 'Carnes':
                            $purchase = rand(8000, 25000);
                            $sale = rand($purchase + 1000, $purchase + 7000);
                            break;
                        case 'Electrodomésticos':
                            $purchase = rand(70000, 350000);
                            $sale = rand($purchase + 5000, $purchase + 40000);
                            break;
                        case 'Ropa':
                            $purchase = rand(12000, 60000);
                            $sale = rand($purchase + 2000, $purchase + 20000);
                            break;
                        default:
                            $purchase = rand(1000, 50000);
                            $sale = rand($purchase + 500, $purchase + 10000);
                    }

                    Product::firstOrCreate([
                        'name' => $nombre,
                        'category_id' => $categoria->id,
                        'branch_id' => $branch->id,
                    ], [
                        'code' => $code,
                        'description' => 'Producto colombiano: ' . $nombre,
                        'purchase_price' => $purchase,
                        'sale_price' => $sale,
                        'stock' => rand(10, 100),
                        'min_stock' => rand(2, 10),
                        'status' => true,
                    ]);
                }
            }
        }
    }
}
