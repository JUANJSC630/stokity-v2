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
        Schema::create('storefront_idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_api_key_id')->constrained('tenant_api_keys')->cascadeOnDelete();
            $table->string('idempotency_key', 64);
            // Null only while the claiming request is still inside its
            // transaction; nobody else can see that state (uncommitted).
            $table->unsignedBigInteger('order_number')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            // The unique index is what makes concurrent first requests with
            // the same header collapse into one number — see
            // StorefrontIdempotencyKey::claimOrReplay().
            $table->unique(['tenant_id', 'tenant_api_key_id', 'idempotency_key'], 'storefront_idem_unique');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storefront_idempotency_keys');
    }
};
