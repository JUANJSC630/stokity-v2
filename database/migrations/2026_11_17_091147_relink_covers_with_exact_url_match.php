<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Re-check the cover links made by the previous migration's backfill with
     * an exact (case-sensitive) URL comparison. MySQL's default collation
     * compares case-insensitively, so a cover could have been linked to a
     * gallery image whose URL differs only in case, which is a different file.
     * Those links are dropped and, when an exact match exists, re-made.
     */
    public function up(): void
    {
        DB::table('products')
            ->whereNotNull('cover_image_id')
            ->select(['id', 'image', 'cover_image_id'])
            ->orderBy('id')
            ->chunkById(500, function ($products) {
                foreach ($products as $product) {
                    $linked = DB::table('product_images')->where('id', $product->cover_image_id)->value('image');

                    if ($linked === $product->image) {
                        continue;
                    }

                    $exactMatch = DB::table('product_images')
                        ->where('product_id', $product->id)
                        ->orderBy('sort_order')
                        ->get(['id', 'image'])
                        ->first(fn ($image) => $image->image === $product->image);

                    DB::table('products')->where('id', $product->id)->update(['cover_image_id' => $exactMatch?->id]);
                }
            });
    }

    /**
     * Nothing to undo: the links it removes were wrong.
     */
    public function down(): void {}
};
