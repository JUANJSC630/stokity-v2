<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Branch;
use App\Models\Category;
use App\Models\SaleReturn;
use App\Models\SaleProduct;
use App\Services\ReportQueryService;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function __construct(
        private ReportQueryService $queries,
        private ReportExportService $exports,
    ) {}

    /**
     * Dashboard principal de reportes
     */
    public function index(Request $request)
    {
        $filters = $this->queries->getFilters($request);

        $dashboardData = [
            'sales_summary'   => $this->queries->getSalesSummary($filters),
            'top_products'    => $this->queries->getTopProducts($filters),
            'sales_by_branch' => $this->queries->getSalesByBranch($filters),
            'sales_by_seller' => $this->queries->getSalesBySeller($filters),
            'returns_summary' => $this->queries->getReturnsSummary($filters),
            'payment_methods' => $this->queries->getPaymentMethodsSummary($filters),
        ];

        $user = Auth::user();

        return Inertia::render('reports/index', [
            'dashboardData' => $dashboardData,
            'filters'       => $filters,
            'branches'      => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories'    => Category::where('status', true)->get(),
            'user'          => [
                'is_admin'    => $user->isAdmin(),
                'branch_id'   => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte detallado de ventas por período
     */
    public function salesDetail(Request $request)
    {
        $filters = $this->queries->getFilters($request);
        $groupBy = $request->get('group_by', 'day');

        $salesData = $this->queries->getSalesByPeriod($filters, $groupBy);

        $totalSales  = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        return Inertia::render('reports/sales-detail', [
            'salesData'    => $salesData->toArray(),
            'salesSummary' => [
                'total_sales'  => $totalSales,
                'total_amount' => $totalAmount,
                'average_sale' => $averageSale,
            ],
            'filters'    => $filters,
            'groupBy'    => $groupBy,
            'branches'   => Branch::where('status', true)->get(),
            'categories' => Category::where('status', true)->get(),
        ]);
    }

    /**
     * Reporte de productos más vendidos
     */
    public function productsReport(Request $request)
    {
        $filters = $this->queries->getFilters($request);

        $productsData = [
            'top_products'         => $this->queries->getTopProducts($filters, 20),
            'products_by_category' => $this->queries->getProductsByCategory($filters),
            'low_stock_products'   => $this->queries->getLowStockProducts($filters),
            'products_performance' => $this->queries->getProductsPerformance($filters),
        ];

        $user = Auth::user();

        return Inertia::render('reports/products-report', [
            'productsData' => $productsData,
            'filters'      => $filters,
            'branches'     => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories'   => Category::where('status', true)->get(),
            'user'         => [
                'is_admin'    => $user->isAdmin(),
                'branch_id'   => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte de vendedores
     */
    public function sellersReport(Request $request)
    {
        $filters = $this->queries->getFilters($request);

        $sellersData = [
            'sellers_performance' => $this->queries->getSellersPerformance($filters),
            'sellers_comparison'  => $this->queries->getSellersComparison($filters),
            'sellers_by_branch'   => $this->queries->getSellersByBranch($filters),
        ];

        $user = Auth::user();

        return Inertia::render('reports/sellers-report', [
            'sellersData' => $sellersData,
            'filters'     => $filters,
            'branches'    => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories'  => Category::where('status', true)->get(),
            'user'        => [
                'is_admin'    => $user->isAdmin(),
                'branch_id'   => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte de sucursales
     */
    public function branchesReport(Request $request)
    {
        $filters = $this->queries->getFilters($request);

        $branchesData = [
            'branches_performance' => $this->queries->getBranchesPerformance($filters),
            'branches_comparison'  => $this->queries->getBranchesComparison($filters),
            'branches_by_region'   => $this->queries->getBranchesByRegion($filters),
        ];

        return Inertia::render('reports/branches-report', [
            'branchesData' => $branchesData,
            'filters'      => $filters,
            'branches'     => Branch::where('status', true)->get(),
            'categories'   => Category::where('status', true)->get(),
        ]);
    }

    /**
     * Reporte de devoluciones
     */
    public function returnsReport(Request $request)
    {
        $filters = $this->queries->getFilters($request);

        $summary          = $this->queries->getReturnsSummary($filters);
        $returnsByProduct = $this->queries->getReturnsByProduct($filters);
        $returnsByReason  = $this->queries->getReturnsByReason($filters);
        $returnsTrend     = $this->queries->getReturnsTrend($filters);

        // Return rate
        $totalSales = Sale::whereIn('status', ['completed', 'cancelled'])
            ->when($filters['date_from'], fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($filters['date_to'], fn ($q, $d) => $q->whereDate('date', '<=', $d))
            ->when($filters['branch_id'], fn ($q, $b) => $q->where('branch_id', $b))
            ->count();

        $returnRate = $totalSales > 0 ? ($summary->total_returns / $totalSales) * 100 : 0;

        // Pre-load product sales to avoid N+1
        $productIds    = $returnsByProduct->pluck('id')->all();
        $salesByProduct = SaleProduct::join('sales', 'sale_products.sale_id', '=', 'sales.id')
            ->whereIn('sale_products.product_id', $productIds)
            ->when($filters['date_from'], fn ($q, $d) => $q->whereDate('sales.date', '>=', $d))
            ->when($filters['date_to'], fn ($q, $d) => $q->whereDate('sales.date', '<=', $d))
            ->when($filters['branch_id'], fn ($q, $b) => $q->where('sales.branch_id', $b))
            ->whereIn('sales.status', ['completed', 'cancelled'])
            ->groupBy('sale_products.product_id')
            ->selectRaw('sale_products.product_id, SUM(sale_products.quantity) as total_sold')
            ->pluck('total_sold', 'product_id');

        $returnsData = [
            'returns_summary' => [
                'total_returns'  => $summary->total_returns,
                'total_amount'   => $summary->total_amount,
                'average_return' => $summary->average_return,
                'return_rate'    => round($returnRate, 2),
            ],
            'returns_by_product' => $returnsByProduct->map(function ($product) use ($salesByProduct) {
                $productSales = $salesByProduct[$product->id] ?? 0;
                $rate = $productSales > 0 ? ($product->returned_quantity / $productSales) * 100 : 0;

                return [
                    'id'             => $product->id,
                    'name'           => $product->name,
                    'code'           => $product->code,
                    'total_returns'  => $product->return_count,
                    'total_quantity' => $product->returned_quantity,
                    'total_amount'   => $product->total_amount ?? 0,
                    'return_rate'    => round($rate, 2),
                ];
            }),
            'returns_by_reason' => $returnsByReason->map(function ($reason) use ($summary) {
                $percentage = $summary->total_returns > 0 ? ($reason->return_count / $summary->total_returns) * 100 : 0;
                return [
                    'reason'       => $reason->reason,
                    'count'        => $reason->return_count,
                    'total_amount' => $reason->total_amount ?? 0,
                    'percentage'   => round($percentage, 2),
                ];
            }),
            'returns_trend' => $returnsTrend->map(fn ($trend) => [
                'date'           => $trend->date,
                'returns_count'  => $trend->return_count,
                'returns_amount' => $trend->return_amount ?? 0,
            ]),
        ];

        $user = Auth::user();

        return Inertia::render('reports/returns-report', [
            'returnsData' => $returnsData,
            'filters'     => $filters,
            'branches'    => Branch::where('status', true)->get(),
            'categories'  => Category::where('status', true)->get(),
            'user'        => [
                'is_admin'    => $user->isAdmin(),
                'branch_id'   => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Balance de caja por sucursal (resumen diario de efectivo)
     */
    public function cashBalance(Request $request)
    {
        $user = Auth::user();
        $date = $request->get('date', today()->toDateString());

        $branchFilter = $user->isAdmin() ? $request->get('branch_id') : $user->branch_id;

        // Ventas completadas del día, agrupadas por sucursal y método de pago
        $salesQuery = Sale::query()
            ->where('status', 'completed')
            ->whereDate('date', $date)
            ->selectRaw('branch_id, payment_method, COUNT(*) as sale_count, SUM(total) as revenue, SUM(amount_paid) as total_received, SUM(change_amount) as total_change')
            ->groupBy('branch_id', 'payment_method');

        if ($branchFilter) {
            $salesQuery->where('branch_id', $branchFilter);
        }

        $salesRows = $salesQuery->get();

        // Devoluciones del día por sucursal
        $returnsByBranch = SaleReturn::whereHas('sale', function ($q) use ($date, $branchFilter) {
            $q->whereDate('date', $date)->where('status', 'completed');
            if ($branchFilter) {
                $q->where('branch_id', $branchFilter);
            }
        })
        ->join('sales', 'sale_returns.sale_id', '=', 'sales.id')
        ->selectRaw('sales.branch_id, COUNT(*) as return_count')
        ->groupBy('sales.branch_id')
        ->get()
        ->keyBy('branch_id');

        $branchIds = $salesRows->pluck('branch_id')->merge($returnsByBranch->keys())->unique();
        $branches  = \App\Models\Branch::whereIn('id', $branchIds)->get()->keyBy('id');

        $availableBranches = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        $grouped = $salesRows->groupBy('branch_id')->map(function ($rows, $branchId) use ($branches, $returnsByBranch) {
            $branch      = $branches->get($branchId);
            $returnCount = $returnsByBranch->get($branchId)?->return_count ?? 0;

            $paymentMethods = $rows->map(fn ($r) => [
                'payment_method' => $r->payment_method,
                'sale_count'     => (int) $r->sale_count,
                'revenue'        => (float) $r->revenue,
                'total_received' => (float) $r->total_received,
                'total_change'   => (float) $r->total_change,
            ])->values();

            $cashRow      = $rows->firstWhere('payment_method', 'cash');
            $netCash      = $cashRow ? (float) $cashRow->revenue - (float) $cashRow->total_change : 0;
            $totalRevenue = $rows->sum('revenue');

            return [
                'branch_id'     => $branchId,
                'branch_name'   => $branch?->name ?? "Sucursal #{$branchId}",
                'return_count'  => (int) $returnCount,
                'payment_rows'  => $paymentMethods,
                'net_cash'      => $netCash,
                'total_revenue' => (float) $totalRevenue,
            ];
        })->values();

        return Inertia::render('reports/cash-balance', [
            'data'              => $grouped,
            'filters'           => ['date' => $date, 'branch_id' => $branchFilter],
            'availableBranches' => $availableBranches,
            'isAdmin'           => $user->isAdmin(),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────
    //  Export endpoints
    // ────────────────────────────────────────────────────────────────────

    /**
     * Exportar reporte general a PDF
     */
    public function exportPdf(Request $request)
    {
        $filters        = $this->queries->getFilters($request);
        $salesData      = $this->queries->getSalesByPeriod($filters, 'day');
        $topProducts    = $this->queries->getTopProducts($filters, 20);
        $salesByBranch  = $this->queries->getSalesByBranch($filters);
        $salesBySeller  = $this->queries->getSalesBySeller($filters);
        $returnsData    = $this->queries->getReturnsByProduct($filters);
        $paymentMethods = $this->queries->getPaymentMethodsSummary($filters);

        $html = $this->exports->generatePdfHtml($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHtml($html);
        $pdf->setPaper('A4', 'landscape');

        return $pdf->download('reporte-ventas-' . now()->format('Y-m-d-H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte general a CSV (streaming)
     */
    public function exportExcel(Request $request)
    {
        $filters        = $this->queries->getFilters($request);
        $salesData      = $this->queries->getSalesByPeriod($filters, 'day');
        $topProducts    = $this->queries->getTopProducts($filters, 50);
        $salesByBranch  = $this->queries->getSalesByBranch($filters);
        $salesBySeller  = $this->queries->getSalesBySeller($filters);
        $returnsData    = $this->queries->getReturnsByProduct($filters);
        $paymentMethods = $this->queries->getPaymentMethodsSummary($filters);

        return $this->exports->streamGeneralCsv(
            'reporte-ventas-' . now()->format('Y-m-d-H-i-s') . '.csv',
            $filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods,
        );
    }

    /**
     * Exportar reporte detallado de ventas a PDF
     */
    public function exportSalesDetailPdf(Request $request)
    {
        $filters   = $this->queries->getFilters($request);
        $groupBy   = $request->get('group_by', 'day');
        $salesData = $this->queries->getSalesByPeriod($filters, $groupBy);

        $totalSales  = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $html = $this->exports->generateSalesDetailPdfHtml($filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy);

        $pdf = \PDF::loadHTML($html);
        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('reporte-detalle-ventas-' . now()->format('Y-m-d-H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte detallado de ventas a CSV (streaming)
     */
    public function exportSalesDetailExcel(Request $request)
    {
        $filters   = $this->queries->getFilters($request);
        $groupBy   = $request->get('group_by', 'day');
        $salesData = $this->queries->getSalesByPeriod($filters, $groupBy);

        $totalSales  = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        return $this->exports->streamSalesDetailCsv(
            'reporte-detalle-ventas-' . now()->format('Y-m-d-H-i-s') . '.csv',
            $filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy,
        );
    }

    /**
     * Exportar reporte de productos a PDF
     */
    public function exportProductsPdf(Request $request)
    {
        $filters           = $this->queries->getFilters($request);
        $productsData      = $this->queries->getProductsPerformance($filters);
        $topProducts       = $this->queries->getTopProducts($filters, 10);
        $productsByCategory = $this->queries->getProductsByCategory($filters);
        $lowStockProducts  = $this->queries->getLowStockProducts();

        $html = $this->exports->generateProductsPdfHtml($filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts);

        $pdf = \PDF::loadHTML($html);

        return $pdf->download('reporte_productos_' . now()->format('Y-m-d_H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte de productos a CSV (streaming)
     */
    public function exportProductsExcel(Request $request)
    {
        $filters           = $this->queries->getFilters($request);
        $productsData      = $this->queries->getProductsPerformance($filters);
        $topProducts       = $this->queries->getTopProducts($filters, 10);
        $productsByCategory = $this->queries->getProductsByCategory($filters);
        $lowStockProducts  = $this->queries->getLowStockProducts();

        return $this->exports->streamProductsCsv(
            'reporte_productos_' . now()->format('Y-m-d_H-i-s') . '.csv',
            $filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts,
        );
    }

    /**
     * Exportar reporte de vendedores a PDF
     */
    public function exportSellersPdf(Request $request)
    {
        $filters           = $this->queries->getFilters($request);
        $sellersData       = $this->queries->getSellersPerformance($filters);
        $sellersComparison = $this->queries->getSellersComparison($filters);
        $sellersByBranch   = $this->queries->getSellersByBranch($filters);

        $html = $this->exports->generateSellersPdfHtml($filters, $sellersData, $sellersComparison, $sellersByBranch);

        $pdf = \PDF::loadHTML($html);

        return $pdf->download('reporte_vendedores_' . now()->format('Y-m-d_H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte de vendedores a CSV (streaming)
     */
    public function exportSellersExcel(Request $request)
    {
        $filters           = $this->queries->getFilters($request);
        $sellersData       = $this->queries->getSellersPerformance($filters);
        $sellersComparison = $this->queries->getSellersComparison($filters);
        $sellersByBranch   = $this->queries->getSellersByBranch($filters);

        return $this->exports->streamSellersCsv(
            'reporte_vendedores_' . now()->format('Y-m-d_H-i-s') . '.csv',
            $filters, $sellersData, $sellersComparison, $sellersByBranch,
        );
    }

    /**
     * Exportar reporte de sucursales a PDF
     */
    public function exportBranchesPdf(Request $request)
    {
        $filters            = $this->queries->getFilters($request);
        $branchesData       = $this->queries->getBranchesPerformance($filters);
        $branchesComparison = $this->queries->getBranchesComparison($filters);

        $html = $this->exports->generateBranchesPdfHtml($filters, $branchesData, $branchesComparison, collect());

        $pdf = \PDF::loadHTML($html);

        return $pdf->download('reporte_sucursales_' . now()->format('Y-m-d_H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte de sucursales a CSV (streaming)
     */
    public function exportBranchesExcel(Request $request)
    {
        $filters            = $this->queries->getFilters($request);
        $branchesData       = $this->queries->getBranchesPerformance($filters);
        $branchesComparison = $this->queries->getBranchesComparison($filters);
        $branchesByRegion   = $this->queries->getBranchesByRegion($filters);

        return $this->exports->streamBranchesCsv(
            'reporte_sucursales_' . now()->format('Y-m-d_H-i-s') . '.csv',
            $filters, $branchesData, $branchesComparison, $branchesByRegion,
        );
    }

    /**
     * Exportar reporte de devoluciones a PDF
     */
    public function exportReturnsPdf(Request $request)
    {
        $filters          = $this->queries->getFilters($request);
        $returnsData      = $this->queries->getReturnsSummary($filters);
        $returnsByProduct = $this->queries->getReturnsByProduct($filters);
        $returnsByReason  = $this->queries->getReturnsByReason($filters);
        $returnsTrend     = $this->queries->getReturnsTrend($filters);

        $html = $this->exports->generateReturnsPdfHtml($filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend);

        $pdf = \PDF::loadHTML($html);

        return $pdf->download('reporte_devoluciones_' . now()->format('Y-m-d_H-i-s') . '.pdf');
    }

    /**
     * Exportar reporte de devoluciones a CSV (streaming)
     */
    public function exportReturnsExcel(Request $request)
    {
        $filters          = $this->queries->getFilters($request);
        $returnsData      = $this->queries->getReturnsSummary($filters);
        $returnsByProduct = $this->queries->getReturnsByProduct($filters);
        $returnsByReason  = $this->queries->getReturnsByReason($filters);
        $returnsTrend     = $this->queries->getReturnsTrend($filters);

        return $this->exports->streamReturnsCsv(
            'reporte_devoluciones_' . now()->format('Y-m-d_H-i-s') . '.csv',
            $filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend,
        );
    }
}
