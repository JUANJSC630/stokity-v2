<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_products', function (Blueprint $table) {
            // Snapshot del precio de costo al momento de la venta.
            // NULL en ventas anteriores a esta migración — el P&L usará
            // products.purchase_price como fallback para esas filas.
            $table->decimal('purchase_price_snapshot', 10, 2)->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('sale_products', function (Blueprint $table) {
            $table->dropColumn('purchase_price_snapshot');
        });
    }
};
