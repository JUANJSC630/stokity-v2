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
        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('default_product_image')->nullable()->after('logo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('default_product_image');
        });
    }
};
