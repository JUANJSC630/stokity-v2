<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseTemplate;
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

        // Default to the user's own branch; ?branch=0 means "all branches" (admin only); ?branch=N filters by N
        $branchId = match (true) {
            (int) $request->input('branch', -1) === 0 => null,       // explicit "all"
            $request->filled('branch') => (int) $request->branch, // specific branch
            default => $user->branch_id,       // default: own branch
        };

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

        $grossProfit = $netRevenue - $cogs;
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
            ->map(function ($row) use ($totalExpenses) {
                /** @var Expense&object{total: numeric-string} $row */
                $cat = $row->category;

                return [
                    'category' => $cat?->name ?? 'Sin categoría',
                    'icon' => $cat?->icon,
                    'color' => $cat?->color,
                    'amount' => (float) $row->total,
                    'pct' => $totalExpenses > 0 ? round((float) $row->total / $totalExpenses * 100, 1) : 0,
                ];
            })
            ->sortByDesc(fn ($item) => $item['amount'])
            ->values();

        $netProfit = $grossProfit - $totalExpenses;

        $branches = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        // ── Gastos del período (lista inline) ────────────────────────────────
        $expensesList = $expensesQuery->clone()
            ->with(['category', 'template'])
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->get();

        // ── Plantillas pendientes del mes actual ─────────────────────────────
        $now = Carbon::now('America/Bogota');
        $pendingTemplates = ExpenseTemplate::with('category')
            ->where('is_active', true)
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->get()
            ->filter(fn ($t) => ! $t->isRegisteredForMonth($now->year, $now->month))
            ->values();

        $categories = ExpenseCategory::orderBy('name')->get(['id', 'name', 'icon', 'color']);

        // Cartera por cobrar — saldos pendientes de créditos installments/due_date activos
        $receivables = (float) \App\Models\CreditSale::whereIn('type', ['installments', 'due_date'])
            ->whereIn('status', ['active', 'overdue'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->sum('balance');

        $activeCreditsCount = \App\Models\CreditSale::whereIn('status', ['active', 'overdue'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->count();

        return Inertia::render('finances/index', [
            'period' => $request->input('period', 'this_month'),
            'dateFrom' => $dateFrom->toDateString(),
            'dateTo' => $dateTo->toDateString(),
            'periodLabel' => $label,
            'selectedBranch' => $branchId,
            'branches' => $branches,

            // P&L
            'revenue' => $revenue,
            'returnsTotal' => $returnsTotal,
            'netRevenue' => $netRevenue,
            'cogs' => $cogs,
            'grossProfit' => $grossProfit,
            'grossMarginPct' => $grossMarginPct,
            'totalExpenses' => $totalExpenses,
            'netProfit' => $netProfit,
            'hasCOGSWarning' => $hasCOGSWarning,

            'expensesByCategory' => $expensesByCategory,

            // Inline expense management
            'expenses' => $expensesList,
            'pendingTemplates' => $pendingTemplates,
            'categories' => $categories,
            'currentMonth' => $now->translatedFormat('F Y'),
            'userBranchId' => $user->branch_id,

            // Cartera por cobrar
            'receivables' => $receivables,
            'activeCreditsCount' => $activeCreditsCount,
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
            'this_week' => [
                Carbon::now($tz)->startOfWeek(),
                Carbon::now($tz)->endOfWeek(),
                'Esta semana',
            ],
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
}
