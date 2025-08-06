<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            
            // Tipo de movimiento: 'in' (entrada), 'out' (salida), 'adjustment' (ajuste)
            $table->enum('type', ['in', 'out', 'adjustment']);
            
            // Cantidad del movimiento
            $table->integer('quantity');
            
            // Stock anterior y nuevo para auditoría
            $table->integer('previous_stock');
            $table->integer('new_stock');
            
            // Precio de compra (para entradas)
            $table->decimal('unit_cost', 10, 2)->nullable();
            
            // Motivo o referencia del movimiento
            $table->string('reference')->nullable(); // Ej: "Compra proveedor XYZ", "Ajuste inventario"
            
            // Notas adicionales
            $table->text('notes')->nullable();
            
            // Fecha del movimiento
            $table->timestamp('movement_date');
            
            $table->timestamps();
            
            // Índices para optimizar consultas
            $table->index(['product_id', 'movement_date']);
            $table->index(['branch_id', 'movement_date']);
            $table->index(['type', 'movement_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
