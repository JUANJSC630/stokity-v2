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
        Schema::table('expense_templates', function (Blueprint $table) {
            // Día del mes en que vence/se repite el gasto (1-28). Null = sin día específico.
            $table->unsignedTinyInteger('due_day')->nullable()->after('reference_amount');
        });
    }

    public function down(): void
    {
        Schema::table('expense_templates', function (Blueprint $table) {
            $table->dropColumn('due_day');
        });
    }
};
