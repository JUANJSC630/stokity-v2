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
        Schema::table('products', function (Blueprint $table) {
            // All optional: existing products keep working with every field null.
            $table->string('material')->nullable()->after('slug');
            $table->string('dimensions')->nullable()->after('material');
            $table->unsignedInteger('weight_grams')->nullable()->after('dimensions');
            $table->string('origin')->nullable()->after('weight_grams');
            $table->string('manufacturing', 20)->nullable()->after('origin');
            $table->string('care_instructions', 1000)->nullable()->after('manufacturing');
            $table->string('color', 60)->nullable()->after('care_instructions');
            $table->string('style', 60)->nullable()->after('color');
            $table->string('seo_title', 70)->nullable()->after('style');
            $table->string('seo_description', 160)->nullable()->after('seo_title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'material', 'dimensions', 'weight_grams', 'origin', 'manufacturing',
                'care_instructions', 'color', 'style', 'seo_title', 'seo_description',
            ]);
        });
    }
};
