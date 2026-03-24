<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't enforce enums — just migrate the data
            DB::statement("UPDATE stock_movements SET type = 'ingreso' WHERE type IN ('in', 'purchase')");
            return;
        }

        // 1. Expand enum to include 'ingreso' alongside old values
        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('in','out','adjustment','purchase','write_off','supplier_return','ingreso') NOT NULL"
        );

        // 2. Migrate existing data
        DB::statement("UPDATE stock_movements SET type = 'ingreso' WHERE type IN ('in', 'purchase')");

        // 3. Remove old values from enum
        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('ingreso','out','adjustment','write_off','supplier_return') NOT NULL"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement("UPDATE stock_movements SET type = 'in' WHERE type = 'ingreso'");
            return;
        }

        // Expand enum to allow reverting
        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('ingreso','out','adjustment','write_off','supplier_return','in','purchase') NOT NULL"
        );

        // Revert data (all ingreso → in; can't recover which were purchase)
        DB::statement("UPDATE stock_movements SET type = 'in' WHERE type = 'ingreso'");

        // Restore original enum
        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('in','out','adjustment','purchase','write_off','supplier_return') NOT NULL"
        );
    }
};
