<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_supplier', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->decimal('purchase_price', 10, 2)->nullable(); // precio pactado con este proveedor
            $table->string('supplier_code')->nullable();           // código del producto en catálogo del proveedor
            $table->boolean('is_default')->default(false);        // proveedor preferido para este producto
            $table->timestamps();

            $table->unique(['product_id', 'supplier_id']);
            $table->index('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_supplier');
    }
};
