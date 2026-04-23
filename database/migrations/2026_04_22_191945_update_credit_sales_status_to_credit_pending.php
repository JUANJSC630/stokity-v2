<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migrate existing credit-linked sales from 'completed' to 'credit_pending'
     * when their associated credit is still active or overdue (not yet fully paid).
     *
     * Sales whose credit is already 'completed' or 'cancelled' are left as-is
     * because they represent historically accurate data.
     */
    public function up(): void
    {
        DB::transaction(function () {
            // Find active (non-deleted) sales linked to credits that are still active/overdue
            $saleIds = DB::table('sales')
                ->join('credit_sales', 'sales.credit_sale_id', '=', 'credit_sales.id')
                ->where('sales.status', 'completed')
                ->whereNull('sales.deleted_at')
                ->whereIn('credit_sales.status', ['active', 'overdue'])
                ->pluck('sales.id');

            if ($saleIds->isNotEmpty()) {
                DB::table('sales')
                    ->whereIn('id', $saleIds)
                    ->update(['status' => 'credit_pending']);
            }

            // Sync amount_paid on those sales to reflect actual payments received
            $activeCreditSales = DB::table('credit_sales')
                ->whereIn('status', ['active', 'overdue'])
                ->whereNotNull('sale_id')
                ->get(['id', 'sale_id', 'amount_paid']);

            foreach ($activeCreditSales as $credit) {
                DB::table('sales')
                    ->where('id', $credit->sale_id)
                    ->update(['amount_paid' => $credit->amount_paid]);
            }
        });
    }

    /**
     * Reverse: set credit_pending sales back to completed.
     */
    public function down(): void
    {
        DB::table('sales')
            ->where('status', 'credit_pending')
            ->update(['status' => 'completed']);
    }
};
