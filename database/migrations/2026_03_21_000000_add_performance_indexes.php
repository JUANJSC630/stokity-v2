<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sales — critical for reports and dashboard queries
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'sales_status_created_idx');
            $table->index(['branch_id', 'status', 'date'], 'sales_branch_status_date_idx');
            $table->index(['session_id'], 'sales_session_id_idx');
            $table->index(['seller_id', 'created_at'], 'sales_seller_created_idx');
        });

        // Products — search and listing
        Schema::table('products', function (Blueprint $table) {
            $table->index(['branch_id', 'status'], 'products_branch_status_idx');
            $table->index(['category_id'], 'products_category_id_idx');
        });

        // Sale products — joins in reports
        Schema::table('sale_products', function (Blueprint $table) {
            $table->index(['product_id', 'sale_id'], 'sale_products_product_sale_idx');
        });

        // Sale returns — date range queries
        Schema::table('sale_returns', function (Blueprint $table) {
            $table->index(['created_at'], 'sale_returns_created_at_idx');
        });

        // Sale return products — aggregations
        Schema::table('sale_return_products', function (Blueprint $table) {
            $table->index(['product_id'], 'sale_return_products_product_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_status_created_idx');
            $table->dropIndex('sales_branch_status_date_idx');
            $table->dropIndex('sales_session_id_idx');
            $table->dropIndex('sales_seller_created_idx');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_branch_status_idx');
            $table->dropIndex('products_category_id_idx');
        });

        Schema::table('sale_products', function (Blueprint $table) {
            $table->dropIndex('sale_products_product_sale_idx');
        });

        Schema::table('sale_returns', function (Blueprint $table) {
            $table->dropIndex('sale_returns_created_at_idx');
        });

        Schema::table('sale_return_products', function (Blueprint $table) {
            $table->dropIndex('sale_return_products_product_idx');
        });
    }
};
