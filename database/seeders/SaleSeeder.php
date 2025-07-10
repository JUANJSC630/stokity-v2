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
        $paymentMethods = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta débito', 'Transferencia', 'Nequi', 'Daviplata'];
        for ($i = 1; $i <= 10; $i++) {
            $branch = $branches->random();
            $client = $clients->random();
            $seller = $sellers->isNotEmpty() ? $sellers->random() : User::first();
            $selectedProducts = $products->random(rand(1, 3));
            $net = 0;
            $tax = 0;
            $items = [];
            foreach ($selectedProducts as $product) {
                $quantity = rand(1, 5);
                $subtotal = $product->sale_price * $quantity;
                $net += $subtotal;
                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $product->sale_price,
                    'subtotal' => $subtotal,
                ];
            }
            $tax = $net * 0.19;
            $total = $net + $tax;
            $sale = Sale::create([
                'branch_id' => $branch->id,
                'code' => 'SALE-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'client_id' => $client->id,
                'seller_id' => $seller->id,
                'tax' => $tax,
                'net' => $net,
                'total' => $total,
                'payment_method' => Arr::random($paymentMethods),
                'date' => now()->subDays(rand(1, 365)),
                'status' => 'completed',
            ]);
            foreach ($items as $item) {
                $sale->products()->attach($item['product_id'], [
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }
        }
    }
}
