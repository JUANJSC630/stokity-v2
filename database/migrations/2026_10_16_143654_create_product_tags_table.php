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
        Schema::create('product_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            // Stable identifier used in the public API (`?tag=artesanal`);
            // deliberately not regenerated when the tag is renamed.
            $table->string('slug', 60);
            $table->string('name', 40);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
        });

        // Lu Accesorios gets "Artesanal" out of the box. Idempotent, and a no-op
        // on databases (tests, other environments) where that business doesn't exist.
        $tenantId = DB::table('tenants')->where('slug', 'luaccesorios')->value('id');

        if ($tenantId) {
            DB::table('product_tags')->insertOrIgnore([
                'tenant_id' => $tenantId,
                'slug' => 'artesanal',
                'name' => 'Artesanal',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_tags');
    }
};
