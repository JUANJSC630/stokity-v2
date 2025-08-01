<?php

namespace Database\Seeders;

use App\Models\Sale;
use App\Models\Client;
use App\Models\Product;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class SaleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = Branch::all();
        $clients = Client::all();
        $products = Product::all();
        $sellers = User::where('role', 'vendedor')->get();
        $paymentMethods = ['cash', 'credit_card', 'debit_card', 'transfer', 'other'];
        for ($i = 1; $i <= 20; $i++) { // Aumentamos a 20 ventas para más datos
            $branch = $branches->random();
            $client = $clients->random();
            $seller = $sellers->isNotEmpty() ? $sellers->random() : User::first();
            $selectedProducts = $products->random(rand(1, 5)); // Hasta 5 productos por venta
            $net = 0;
            $tax = 0;
            $items = [];
            
            foreach ($selectedProducts as $product) {
                $quantity = rand(1, 3); // Cantidad más realista
                $subtotal = $product->sale_price * $quantity;
                $net += $subtotal;
                
                // Calcular impuesto por producto
                $productTax = $product->tax ?? 0;
                $productTaxAmount = $subtotal * ($productTax / 100);
                $tax += $productTaxAmount;
                
                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $product->sale_price,
                    'subtotal' => $subtotal,
                ];
            }
            
            $total = $net + $tax;
            $paymentMethod = Arr::random($paymentMethods);
            $amountPaid = $total;
            $changeAmount = 0;
            $status = 'completed';
            
            // Para pagos diferentes a efectivo, siempre se asume pago completo
            if ($paymentMethod !== 'cash') {
                $amountPaid = $total;
                $changeAmount = 0;
            } else {
                // Solo para pagos en efectivo simulamos diferentes escenarios
                $rand = rand(1, 100);
                
                if ($rand <= 70) {
                    // Caso 1: Pago exacto (70% de probabilidad)
                    $amountPaid = $total;
                    $changeAmount = 0;
                } elseif ($rand <= 95) {
                    // Caso 2: Paga con billete grande (25% de probabilidad)
                    // Redondear el total para trabajar con billetes realistas
                    $totalRedondeado = ceil($total / 1000) * 1000;
                    
                    // Determinar con qué billete paga (siempre mayor al total)
                    if ($totalRedondeado <= 5000) {
                        $billete = 10000;
                    } elseif ($totalRedondeado <= 10000) {
                        $billete = 20000;
                    } elseif ($totalRedondeado <= 20000) {
                        $billete = 50000;
                    } elseif ($totalRedondeado <= 50000) {
                        $billete = 100000;
                    } else {
                        // Para totales muy grandes, redondear al siguiente múltiplo de 50000
                        $billete = ceil($totalRedondeado / 50000) * 50000;
                    }
                    
                    $amountPaid = $billete;
                    $changeAmount = $amountPaid - $total;
                } else {
                    // Caso 3: Pago pendiente (5% de probabilidad)
                    // El cliente paga entre 80% y 95% del total
                    $porcentajePago = rand(80, 95) / 100;
                    $amountPaid = round($total * $porcentajePago, -3); // Redondeamos a miles
                    $pendingAmount = $total - $amountPaid;
                    $changeAmount = 0;
                    $status = 'pending';
                }
            }
            
            // Generar código de venta con timestamp
            $saleCode = now()->subDays(rand(0, 7))->format('YmdHis') . rand(100, 999);
            $sale = Sale::create([
                'branch_id' => $branch->id,
                'code' => $saleCode,
                'client_id' => $client->id,
                'seller_id' => $seller->id,
                'tax' => $tax,
                'net' => $net,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_amount' => $changeAmount,
                'payment_method' => $paymentMethod,
                'date' => now()->subDays(rand(0, 7)),
                'status' => $status,
            ]);
            
            // Guardar productos vendidos y actualizar stock
            foreach ($items as $item) {
                $sale->saleProducts()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);
                
                // Actualizar stock del producto
                $product = Product::find($item['product_id']);
                if ($product) {
                    $product->stock = max(0, $product->stock - $item['quantity']);
                    $product->save();
                }
            }
        }
    }
}
