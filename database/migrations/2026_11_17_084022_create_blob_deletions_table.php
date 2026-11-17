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
        // Blobs waiting to be deleted. Nothing is removed from Vercel Blob on the
        // spot: `blobs:purge` deletes a row's file only once `delete_after` has
        // passed AND no product, gallery image, user or setting references the
        // URL any more, so a mistaken replace or delete can still be undone.
        Schema::create('blob_deletions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('url', 2048);
            $table->char('url_hash', 64)->unique();
            $table->timestamp('delete_after')->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blob_deletions');
    }
};
