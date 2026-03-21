<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't enforce enum — the column already accepts any string value
            return;
        }

        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('in','out','adjustment','purchase','write_off','supplier_return') NOT NULL"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Remove rows with new types before reverting (prevents data-truncation error)
        DB::statement("DELETE FROM stock_movements WHERE type IN ('purchase','write_off','supplier_return')");
        DB::statement(
            "ALTER TABLE stock_movements MODIFY COLUMN type ENUM('in','out','adjustment') NOT NULL"
        );
    }
};
