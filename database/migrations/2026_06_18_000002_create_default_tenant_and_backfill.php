<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * PR-3 (multi-tenancy) — DATA migration.
 *
 * Creates the tenant that owns all pre-tenancy data and assigns every existing
 * business row to it. Idempotent and safe to re-run:
 * - Reuses an existing tenant instead of creating duplicates.
 * - Only fills rows where tenant_id IS NULL.
 *
 * tenant_id stays NULLABLE here. NOT NULL + composite unique constraints are
 * applied later, AFTER the BelongsToTenant trait (PR-4) auto-stamps new writes.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'business_settings', 'branches', 'users', 'archived_users', 'categories',
        'products', 'clients', 'payment_methods', 'suppliers', 'sales',
        'sale_products', 'sale_returns', 'sale_return_products', 'stock_movements',
        'cash_sessions', 'cash_movements', 'credit_sales', 'credit_sale_items',
        'credit_payments', 'expenses', 'expense_categories', 'expense_templates',
        'product_supplier',
    ];

    public function up(): void
    {
        // Atomic: either the tenant is created and ALL rows are assigned, or nothing.
        DB::transaction(function () {
            $this->backfill();
        });
    }

    private function backfill(): void
    {
        // 1. Ensure a tenant exists to own all legacy data.
        $existing = DB::table('tenants')->orderBy('id')->first();

        if ($existing) {
            $tenantId = $existing->id;
        } else {
            $bs = Schema::hasTable('business_settings') ? DB::table('business_settings')->first() : null;
            $name = $bs->name ?? config('app.name', 'Mi Negocio');

            $slug = Str::slug($name) ?: 'tenant';
            $base = $slug;
            $n = 1;
            while (DB::table('tenants')->where('slug', $slug)->exists()) {
                $slug = $base.'-'.(++$n);
            }

            $tenantId = DB::table('tenants')->insertGetId([
                'name' => $name,
                'slug' => $slug,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Assign every pre-existing row to that tenant.
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'tenant_id')) {
                DB::table($table)->whereNull('tenant_id')->update(['tenant_id' => $tenantId]);
            }
        }
    }

    public function down(): void
    {
        // Reverse the assignment; leave the tenant row in place.
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'tenant_id')) {
                DB::table($table)->update(['tenant_id' => null]);
            }
        }
    }
};
