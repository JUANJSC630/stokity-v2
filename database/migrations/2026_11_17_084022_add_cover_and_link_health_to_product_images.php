<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // The cover as a reference to a gallery row, not just a copied URL:
            // deleting that row can then never leave `image` pointing at a file
            // nobody tracks any more. Null when the cover is not a gallery image
            // (uploaded from Stokity itself, or the business default).
            $table->foreignId('cover_image_id')->nullable()->after('image')
                ->constrained('product_images')->nullOnDelete();
            $table->boolean('image_ok')->nullable()->after('cover_image_id');
            $table->timestamp('image_checked_at')->nullable()->after('image_ok');
        });

        Schema::table('product_images', function (Blueprint $table) {
            $table->boolean('image_ok')->nullable()->after('alt_text');
            $table->timestamp('image_checked_at')->nullable()->after('image_ok');
        });

        DB::table('product_images')
            ->select(['id', 'product_id', 'image'])
            ->orderBy('id')
            ->chunkById(500, function ($images) {
                foreach ($images as $image) {
                    DB::table('products')
                        ->where('id', $image->product_id)
                        ->where('image', $image->image)
                        ->whereNull('cover_image_id')
                        ->update(['cover_image_id' => $image->id]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cover_image_id');
            $table->dropColumn(['image_ok', 'image_checked_at']);
        });

        Schema::table('product_images', function (Blueprint $table) {
            $table->dropColumn(['image_ok', 'image_checked_at']);
        });
    }
};
