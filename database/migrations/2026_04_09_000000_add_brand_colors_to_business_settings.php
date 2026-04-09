<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('brand_color', 7)->nullable()->after('currency_symbol');
            $table->string('brand_color_secondary', 7)->nullable()->after('brand_color');
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['brand_color', 'brand_color_secondary']);
        });
    }
};
