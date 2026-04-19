<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_return_products', function (Blueprint $table) {
            $table->decimal('effective_price', 10, 2)->nullable()->after('quantity');
        });

        // Backfill: compute effective_price using sale-time price and proportional discount.
        // Note: DDL (ALTER TABLE above) causes an implicit commit in MySQL — only this DML is transactional.
        DB::transaction(function () {
            DB::statement('
                UPDATE sale_return_products srp
                JOIN sale_returns sr ON sr.id = srp.sale_return_id
                JOIN sale_products sp ON sp.sale_id = sr.sale_id AND sp.product_id = srp.product_id
                JOIN sales s ON s.id = sr.sale_id
                SET srp.effective_price = ROUND(
                    sp.price * (1 - IF(
                        s.discount_amount > 0,
                        s.discount_amount / NULLIF((
                            SELECT SUM(sp2.subtotal) FROM sale_products sp2 WHERE sp2.sale_id = s.id
                        ), 0),
                        0
                    )),
                    2
                )
                WHERE srp.effective_price IS NULL
            ');
        });
    }

    public function down(): void
    {
        Schema::table('sale_return_products', function (Blueprint $table) {
            $table->dropColumn('effective_price');
        });
    }
};
