<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_products', function (Blueprint $table) {
            $table->unique(['sale_id', 'product_id'], 'sale_products_sale_product_unique');
        });
    }

    public function down(): void
    {
        Schema::table('sale_products', function (Blueprint $table) {
            $table->dropUnique('sale_products_sale_product_unique');
        });
    }
};
