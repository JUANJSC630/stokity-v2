<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $paymentMethods = [
            [
                'name' => 'Efectivo',
                'code' => 'cash',
                'description' => 'Pago en efectivo (billetes y monedas)',
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'name' => 'Tarjeta de Crédito',
                'code' => 'credit_card',
                'description' => 'Pago con tarjeta de crédito',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Tarjeta de Débito',
                'code' => 'debit_card',
                'description' => 'Pago con tarjeta de débito',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Transferencia Bancaria',
                'code' => 'bank_transfer',
                'description' => 'Transferencia bancaria (PSE, consignación, etc.)',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Nequi',
                'code' => 'nequi',
                'description' => 'Pago a través de la billetera digital Nequi',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'DaviPlata',
                'code' => 'daviplata',
                'description' => 'Pago a través de la billetera digital DaviPlata',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'PSE (Pagos Seguros en Línea)',
                'code' => 'pse',
                'description' => 'Pago a través del botón PSE',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'Addi',
                'code' => 'addi',
                'description' => 'Pago a plazos con Addi',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'Bipi',
                'code' => 'bipi',
                'description' => 'Pago a través de Bipi (Bancolombia)',
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'Cheque',
                'code' => 'check',
                'description' => 'Pago con cheque bancario',
                'is_active' => true,
                'sort_order' => 9,
            ],
        ];

        foreach ($paymentMethods as $paymentMethod) {
            PaymentMethod::updateOrCreate(
                ['code' => $paymentMethod['code']],
                $paymentMethod
            );
        }
    }
} 