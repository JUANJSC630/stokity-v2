<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PR-2 (multi-tenancy): add a NULLABLE tenant_id + index to every business table.
 *
 * Intentionally additive and safe:
 * - Column is nullable (existing rows get NULL; nothing reads it yet).
 * - No foreign key and no NOT NULL constraint here — those are added in PR-3
 *   AFTER the data backfill assigns the existing rows to tenant 1.
 *
 * Framework tables (migrations, sessions, cache, jobs, password_reset_tokens)
 * are intentionally excluded.
 */
return new class extends Migration
{
    /**
     * Business tables that must be scoped to a tenant.
     *
     * @var list<string>
     */
    private array $tables = [
        'business_settings',
        'branches',
        'users',
        'archived_users',
        'categories',
        'products',
        'clients',
        'payment_methods',
        'suppliers',
        'sales',
        'sale_products',
        'sale_returns',
        'sale_return_products',
        'stock_movements',
        'cash_sessions',
        'cash_movements',
        'credit_sales',
        'credit_sale_items',
        'credit_payments',
        'expenses',
        'expense_categories',
        'expense_templates',
        'product_supplier',
    ];

    public function up(): void
    {
        foreach ($this->tables as $name) {
            if (! Schema::hasTable($name) || Schema::hasColumn($name, 'tenant_id')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) use ($name) {
                $table->unsignedBigInteger('tenant_id')->nullable();
                $table->index('tenant_id', "{$name}_tenant_id_idx");
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $name) {
            if (! Schema::hasTable($name) || ! Schema::hasColumn($name, 'tenant_id')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) use ($name) {
                $table->dropIndex("{$name}_tenant_id_idx");
                $table->dropColumn('tenant_id');
            });
        }
    }
};
