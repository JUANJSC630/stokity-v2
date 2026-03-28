<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->string('reference_type', 50)->nullable()->after('notes');
            $table->unsignedBigInteger('reference_id')->nullable()->after('reference_type');

            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::table('cash_movements', function (Blueprint $table) {
            $table->dropIndex(['reference_type', 'reference_id']);
            $table->dropColumn(['reference_type', 'reference_id']);
        });
    }
};
