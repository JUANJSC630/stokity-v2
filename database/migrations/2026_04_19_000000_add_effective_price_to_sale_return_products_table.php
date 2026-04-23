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
            $driver = DB::connection()->getDriverName();

            if ($driver === 'sqlite') {
                // SQLite does not support UPDATE with JOIN — use a subquery approach
                DB::statement('
                    UPDATE sale_return_products
                    SET effective_price = (
                        SELECT ROUND(
                            sp.price * (1 - CASE
                                WHEN s.discount_amount > 0 THEN
                                    s.discount_amount / COALESCE(NULLIF((
                                        SELECT SUM(sp2.subtotal) FROM sale_products sp2 WHERE sp2.sale_id = s.id
                                    ), 0), 1)
                                ELSE 0
                            END),
                            2
                        )
                        FROM sale_returns sr
                        JOIN sale_products sp ON sp.sale_id = sr.sale_id AND sp.product_id = sale_return_products.product_id
                        JOIN sales s ON s.id = sr.sale_id
                        WHERE sr.id = sale_return_products.sale_return_id
                    )
                    WHERE effective_price IS NULL
                ');
            } else {
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
            }
        });
    }

    public function down(): void
    {
        Schema::table('sale_return_products', function (Blueprint $table) {
            $table->dropColumn('effective_price');
        });
    }
};
