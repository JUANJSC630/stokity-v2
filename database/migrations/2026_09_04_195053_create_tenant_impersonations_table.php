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
        // Platform-wide security log — deliberately has no tenant_id scope
        // column of its own kind (BelongsToTenant); it records super-admin
        // actions across tenants, not tenant business data.
        Schema::create('tenant_impersonations', function (Blueprint $table) {
            $table->id();
            // nullOnDelete (not cascade): this is a security audit trail —
            // hard-deleting a user or tenant later must never silently erase
            // the record that someone accessed that account.
            $table->foreignId('super_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('impersonated_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['super_admin_id', 'ended_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_impersonations');
    }
};
