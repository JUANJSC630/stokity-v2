<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\SaleProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function summary(Request $request): Response
    {
        $user = Auth::user();

        [$dateFrom, $dateTo, $label] = $this->resolvePeriod($request);

        $branchId = $user->isAdmin() && $request->filled('branch')
            ? (int) $request->branch
            : ($user->isAdmin() ? null : $user->branch_id);

        // ── Revenue: ventas completadas del período ──────────────────────────
        $salesQuery = DB::table('sales')
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->whereBetween('date', [$dateFrom->startOfDay()->toDateTimeString(), $dateTo->copy()->endOfDay()->toDateTimeString()])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $revenue = (float) $salesQuery->sum('total');

        // Devoluciones del período (calculado desde sale_return_products × precio de venta)
        $returnsTotal = (float) DB::table('sale_return_products as srp')
            ->join('sale_returns as sr', 'srp.sale_return_id', '=', 'sr.id')
            ->join('sales as s', 'sr.sale_id', '=', 's.id')
            ->join('sale_products as sp', function ($join) {
                $join->on('sp.sale_id', '=', 's.id')
                     ->on('sp.product_id', '=', 'srp.product_id');
            })
            ->whereNull('s.deleted_at')
            ->whereBetween('sr.created_at', [$dateFrom->startOfDay(), $dateTo->copy()->endOfDay()])
            ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
            ->sum(DB::raw('srp.quantity * sp.price'));

        $netRevenue = max(0, $revenue - $returnsTotal);

        // ── COGS: costo de lo vendido ────────────────────────────────────────
        // COALESCE: usa snapshot si existe, sino precio de costo actual del producto
        $cogs = (float) DB::table('sale_products as sp')
            ->join('sales as s', 'sp.sale_id', '=', 's.id')
            ->join('products as p', 'sp.product_id', '=', 'p.id')
            ->where('s.status', 'completed')
            ->whereNull('s.deleted_at')
            ->whereBetween('s.date', [$dateFrom->startOfDay()->toDateTimeString(), $dateTo->copy()->endOfDay()->toDateTimeString()])
            ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
            ->sum(DB::raw('sp.quantity * COALESCE(sp.purchase_price_snapshot, p.purchase_price)'));

        $grossProfit    = $netRevenue - $cogs;
        $grossMarginPct = $netRevenue > 0 ? round($grossProfit / $netRevenue * 100, 1) : 0;

        // Detectar ventas sin snapshot (datos históricos pre-migración)
        $hasCOGSWarning = DB::table('sale_products as sp')
            ->join('sales as s', 'sp.sale_id', '=', 's.id')
            ->where('s.status', 'completed')
            ->whereNull('s.deleted_at')
            ->whereBetween('s.date', [$dateFrom->startOfDay()->toDateTimeString(), $dateTo->copy()->endOfDay()->toDateTimeString()])
            ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
            ->whereNull('sp.purchase_price_snapshot')
            ->exists();

        // ── Gastos del período ───────────────────────────────────────────────
        $expensesQuery = Expense::with('category')
            ->whereDate('expense_date', '>=', $dateFrom)
            ->whereDate('expense_date', '<=', $dateTo)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $totalExpenses = (float) $expensesQuery->clone()->sum('amount');

        $expensesByCategory = $expensesQuery->clone()
            ->select('expense_category_id', DB::raw('SUM(amount) as total'))
            ->groupBy('expense_category_id')
            ->with('category')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->category?->name ?? 'Sin categoría',
                'icon'     => $row->category?->icon,
                'color'    => $row->category?->color,
                'amount'   => (float) $row->total,
                'pct'      => $totalExpenses > 0 ? round($row->total / $totalExpenses * 100, 1) : 0,
            ])
            ->sortByDesc('amount')
            ->values();

        $netProfit = $grossProfit - $totalExpenses;

        // ── Tendencia últimos 6 meses ────────────────────────────────────────
        $trend = $this->buildMonthlyTrend($branchId, 6);

        // ── Top 10 productos por margen bruto ────────────────────────────────
        $topProducts = DB::table('sale_products as sp')
            ->join('sales as s', 'sp.sale_id', '=', 's.id')
            ->join('products as p', 'sp.product_id', '=', 'p.id')
            ->where('s.status', 'completed')
            ->whereNull('s.deleted_at')
            ->whereBetween('s.date', [$dateFrom->startOfDay()->toDateTimeString(), $dateTo->copy()->endOfDay()->toDateTimeString()])
            ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
            ->select(
                'p.id',
                'p.name',
                'p.code',
                DB::raw('SUM(sp.quantity) as units_sold'),
                DB::raw('SUM(sp.subtotal) as revenue'),
                DB::raw('SUM(sp.quantity * COALESCE(sp.purchase_price_snapshot, p.purchase_price)) as cogs'),
                DB::raw('SUM(sp.subtotal) - SUM(sp.quantity * COALESCE(sp.purchase_price_snapshot, p.purchase_price)) as gross_profit'),
            )
            ->groupBy('p.id', 'p.name', 'p.code')
            ->orderByDesc('gross_profit')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'id'           => $row->id,
                'name'         => $row->name,
                'code'         => $row->code,
                'units_sold'   => (int) $row->units_sold,
                'revenue'      => (float) $row->revenue,
                'cogs'         => (float) $row->cogs,
                'gross_profit' => (float) $row->gross_profit,
                'margin_pct'   => $row->revenue > 0
                    ? round(($row->gross_profit / $row->revenue) * 100, 1)
                    : 0,
            ]);

        $branches = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        return Inertia::render('finances/index', [
            'period'          => $request->input('period', 'this_month'),
            'dateFrom'        => $dateFrom->toDateString(),
            'dateTo'          => $dateTo->toDateString(),
            'periodLabel'     => $label,
            'selectedBranch'  => $branchId,
            'branches'        => $branches,

            // P&L
            'revenue'         => $revenue,
            'returnsTotal'    => $returnsTotal,
            'netRevenue'      => $netRevenue,
            'cogs'            => $cogs,
            'grossProfit'     => $grossProfit,
            'grossMarginPct'  => $grossMarginPct,
            'totalExpenses'   => $totalExpenses,
            'netProfit'       => $netProfit,
            'hasCOGSWarning'  => $hasCOGSWarning,

            'expensesByCategory' => $expensesByCategory,
            'monthlyTrend'       => $trend,
            'topProducts'        => $topProducts,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function resolvePeriod(Request $request): array
    {
        $tz = 'America/Bogota';

        return match ($request->input('period', 'this_month')) {
            'last_month' => [
                Carbon::now($tz)->subMonthNoOverflow()->startOfMonth(),
                Carbon::now($tz)->subMonthNoOverflow()->endOfMonth(),
                'Mes anterior',
            ],
            'this_year' => [
                Carbon::now($tz)->startOfYear(),
                Carbon::now($tz)->endOfYear(),
                'Este año',
            ],
            'custom' => [
                Carbon::parse($request->input('date_from', now($tz)->startOfMonth()), $tz),
                Carbon::parse($request->input('date_to', now($tz)->endOfMonth()), $tz),
                'Período personalizado',
            ],
            default => [ // this_month
                Carbon::now($tz)->startOfMonth(),
                Carbon::now($tz)->endOfMonth(),
                'Este mes',
            ],
        };
    }

    private function buildMonthlyTrend(?int $branchId, int $months): array
    {
        $tz   = 'America/Bogota';
        $rows = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $start = Carbon::now($tz)->subMonths($i)->startOfMonth();
            $end   = Carbon::now($tz)->subMonths($i)->endOfMonth();

            $rev = (float) DB::table('sales')
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->whereBetween('date', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->sum('total');

            $cogsMonth = (float) DB::table('sale_products as sp')
                ->join('sales as s', 'sp.sale_id', '=', 's.id')
                ->join('products as p', 'sp.product_id', '=', 'p.id')
                ->where('s.status', 'completed')
                ->whereNull('s.deleted_at')
                ->whereBetween('s.date', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->when($branchId, fn ($q) => $q->where('s.branch_id', $branchId))
                ->sum(DB::raw('sp.quantity * COALESCE(sp.purchase_price_snapshot, p.purchase_price)'));

            $exp = (float) Expense::whereDate('expense_date', '>=', $start)
                ->whereDate('expense_date', '<=', $end)
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->sum('amount');

            $gross = $rev - $cogsMonth;

            $rows[] = [
                'month'        => $start->translatedFormat('M Y'),
                'revenue'      => $rev,
                'cogs'         => $cogsMonth,
                'gross_profit' => $gross,
                'expenses'     => $exp,
                'net_profit'   => $gross - $exp,
            ];
        }

        return $rows;
    }
}
