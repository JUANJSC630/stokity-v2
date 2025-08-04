<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use App\Models\Branch;
use App\Models\User;
use App\Models\Category;
use App\Models\SaleReturn;
use App\Models\SaleProduct;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Dashboard principal de reportes
     */
    public function index(Request $request)
    {
        $filters = $this->getFilters($request);

        // Obtener datos del dashboard
        $dashboardData = [
            'sales_summary' => $this->getSalesSummary($filters),
            'top_products' => $this->getTopProducts($filters),
            'sales_by_branch' => $this->getSalesByBranch($filters),
            'sales_by_seller' => $this->getSalesBySeller($filters),
            'returns_summary' => $this->getReturnsSummary($filters),
            'payment_methods' => $this->getPaymentMethodsSummary($filters),
        ];

        $user = Auth::user();

        return Inertia::render('reports/index', [
            'dashboardData' => $dashboardData,
            'filters' => $filters,
            'branches' => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories' => Category::where('status', true)->get(),
            'user' => [
                'is_admin' => $user->isAdmin(),
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte detallado de ventas por período
     */
    public function salesDetail(Request $request)
    {
        $filters = $this->getFilters($request);
        $groupBy = $request->get('group_by', 'day'); // day, week, month, year

        $salesData = $this->getSalesByPeriod($filters, $groupBy);

        // Debug: verificar datos
        \Log::info('Sales Data Debug', [
            'salesData' => $salesData->toArray(),
            'filters' => $filters,
            'groupBy' => $groupBy
        ]);

        // Calcular totales agregados para las tarjetas de resumen
        $totalSales = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $salesSummary = [
            'total_sales' => $totalSales,
            'total_amount' => $totalAmount,
            'average_sale' => $averageSale,
        ];

        return Inertia::render('reports/sales-detail', [
            'salesData' => $salesData->toArray(),
            'salesSummary' => $salesSummary,
            'filters' => $filters,
            'groupBy' => $groupBy,
            'branches' => Branch::where('status', true)->get(),
            'categories' => Category::where('status', true)->get(),
        ]);
    }

    /**
     * Exportar reporte de sales-detail a PDF
     */
    public function exportSalesDetailPdf(Request $request)
    {
        \Log::info('Iniciando exportación PDF Sales Detail', ['request' => $request->all()]);

        $filters = $this->getFilters($request);
        $groupBy = $request->get('group_by', 'day');

        $salesData = $this->getSalesByPeriod($filters, $groupBy);

        // Calcular totales
        $totalSales = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $html = $this->generateSalesDetailPdfHtml($filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy);

        $filename = 'reporte-detalle-ventas-' . now()->format('Y-m-d-H-i-s') . '.pdf';

        try {
            $pdf = \PDF::loadHTML($html);
            $pdf->setPaper('a4', 'portrait');

            \Log::info('PDF generado exitosamente', ['file_name' => $filename]);

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('Error generando PDF', ['error' => $e->getMessage()]);
            return back()->with('error', 'Error generando el PDF');
        }
    }

    /**
     * Exportar reporte de sales-detail a Excel
     */
    public function exportSalesDetailExcel(Request $request)
    {
        \Log::info('Iniciando exportación Excel Sales Detail', ['request' => $request->all()]);

        $filters = $this->getFilters($request);
        $groupBy = $request->get('group_by', 'day');

        $salesData = $this->getSalesByPeriod($filters, $groupBy);

        // Calcular totales
        $totalSales = $salesData->sum('total_sales');
        $totalAmount = $salesData->sum('total_amount');
        $averageSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $csvContent = $this->generateSalesDetailCsvContent($filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy);

        $filename = 'reporte-detalle-ventas-' . now()->format('Y-m-d-H-i-s') . '.csv';

        try {
            \Log::info('CSV generado exitosamente', ['file_size' => strlen($csvContent)]);

            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error generando CSV', ['error' => $e->getMessage()]);
            return back()->with('error', 'Error generando el CSV');
        }
    }

    /**
     * Reporte de productos más vendidos
     */
    public function productsReport(Request $request)
    {
        $filters = $this->getFilters($request);

        $topProducts = $this->getTopProducts($filters, 20);

        // Debug: verificar datos de productos
        \Log::info('Products Data Debug', [
            'top_products' => $topProducts->toArray(),
            'filters' => $filters
        ]);

        $productsData = [
            'top_products' => $topProducts,
            'products_by_category' => $this->getProductsByCategory($filters),
            'low_stock_products' => $this->getLowStockProducts($filters),
            'products_performance' => $this->getProductsPerformance($filters),
        ];



        $user = Auth::user();

        return Inertia::render('reports/products-report', [
            'productsData' => $productsData,
            'filters' => $filters,
            'branches' => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories' => Category::where('status', true)->get(),
            'user' => [
                'is_admin' => $user->isAdmin(),
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte de vendedores
     */
    public function sellersReport(Request $request)
    {
        $filters = $this->getFilters($request);

        $sellersData = [
            'sellers_performance' => $this->getSellersPerformance($filters),
            'sellers_comparison' => $this->getSellersComparison($filters),
            'sellers_by_branch' => $this->getSellersByBranch($filters),
        ];

        $user = Auth::user();

        return Inertia::render('reports/sellers-report', [
            'sellersData' => $sellersData,
            'filters' => $filters,
            'branches' => $user->isAdmin() ? Branch::where('status', true)->get() : collect(),
            'categories' => Category::where('status', true)->get(),
            'user' => [
                'is_admin' => $user->isAdmin(),
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Reporte de sucursales
     */
    public function branchesReport(Request $request)
    {
        $filters = $this->getFilters($request);

        $branchesData = [
            'branches_performance' => $this->getBranchesPerformance($filters),
            'branches_comparison' => $this->getBranchesComparison($filters),
            'branches_by_region' => $this->getBranchesByRegion($filters),
        ];

        return Inertia::render('reports/branches-report', [
            'branchesData' => $branchesData,
            'filters' => $filters,
            'branches' => Branch::where('status', true)->get(),
            'categories' => Category::where('status', true)->get(),
        ]);
    }

    /**
     * Reporte de devoluciones
     */
    public function returnsReport(Request $request)
    {
        $filters = $this->getFilters($request);

        // Obtener datos base
        $summary = $this->getReturnsSummary($filters);
        $returnsByProduct = $this->getReturnsByProduct($filters);
        $returnsByReason = $this->getReturnsByReason($filters);
        $returnsTrend = $this->getReturnsTrend($filters);

        // Calcular tasa de devolución
        $totalSales = Sale::whereIn('status', ['completed', 'cancelled'])
            ->when($filters['date_from'], function ($query, $date) {
                return $query->whereDate('date', '>=', $date);
            })
            ->when($filters['date_to'], function ($query, $date) {
                return $query->whereDate('date', '<=', $date);
            })
            ->when($filters['branch_id'], function ($query, $branchId) {
                return $query->where('branch_id', $branchId);
            })
            ->count();

        $returnRate = $totalSales > 0 ? ($summary->total_returns / $totalSales) * 100 : 0;

        // Formatear datos para el frontend
        $returnsData = [
            'returns_summary' => [
                'total_returns' => $summary->total_returns,
                'total_amount' => $summary->total_amount,
                'average_return' => $summary->average_return,
                'return_rate' => round($returnRate, 2),
            ],
            'returns_by_product' => $returnsByProduct->map(function ($product) use ($summary, $filters) {
                // Calcular tasa de devolución por producto
                $productSales = SaleProduct::join('sales', 'sale_products.sale_id', '=', 'sales.id')
                    ->where('sale_products.product_id', $product->id)
                    ->when($filters['date_from'], function ($query, $date) {
                        return $query->whereDate('sales.date', '>=', $date);
                    })
                    ->when($filters['date_to'], function ($query, $date) {
                        return $query->whereDate('sales.date', '<=', $date);
                    })
                    ->when($filters['branch_id'], function ($query, $branchId) {
                        return $query->where('sales.branch_id', $branchId);
                    })
                    ->whereIn('sales.status', ['completed', 'cancelled'])
                    ->sum('sale_products.quantity');

                $returnRate = $productSales > 0 ? ($product->returned_quantity / $productSales) * 100 : 0;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'total_returns' => $product->return_count,
                    'total_quantity' => $product->returned_quantity,
                    'total_amount' => $product->total_amount ?? 0,
                    'return_rate' => round($returnRate, 2),
                ];
            }),
            'returns_by_reason' => $returnsByReason->map(function ($reason) use ($summary) {
                $percentage = $summary->total_returns > 0 ? ($reason->return_count / $summary->total_returns) * 100 : 0;
                return [
                    'reason' => $reason->reason,
                    'count' => $reason->return_count,
                    'total_amount' => $reason->total_amount ?? 0,
                    'percentage' => round($percentage, 2),
                ];
            }),
            'returns_trend' => $returnsTrend->map(function ($trend) {
                return [
                    'date' => $trend->date,
                    'returns_count' => $trend->return_count,
                    'returns_amount' => $trend->return_amount ?? 0,
                ];
            }),
        ];

        $user = Auth::user();

        return Inertia::render('reports/returns-report', [
            'returnsData' => $returnsData,
            'filters' => $filters,
            'branches' => Branch::where('status', true)->get(),
            'categories' => Category::where('status', true)->get(),
            'user' => [
                'is_admin' => $user->isAdmin(),
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch ? ($user->branch->business_name || $user->branch->name) : null,
            ],
        ]);
    }

    /**
     * Exportar reporte a PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            \Log::info('Iniciando exportación PDF', ['request' => $request->all()]);

            $filters = $this->getFilters($request);
            \Log::info('Filtros aplicados', $filters);

            // Obtener datos para el reporte
            $salesData = $this->getSalesByPeriod($filters, 'day');
            $topProducts = $this->getTopProducts($filters, 20);
            $salesByBranch = $this->getSalesByBranch($filters);
            $salesBySeller = $this->getSalesBySeller($filters);
            $returnsData = $this->getReturnsByProduct($filters);
            $paymentMethods = $this->getPaymentMethodsSummary($filters);

            \Log::info('Datos obtenidos para PDF', [
                'sales_count' => count($salesData),
                'products_count' => count($topProducts),
                'branches_count' => count($salesByBranch),
                'sellers_count' => count($salesBySeller),
                'returns_count' => count($returnsData),
                'payment_methods_count' => count($paymentMethods)
            ]);

            // Generar contenido HTML para PDF
            $html = $this->generatePdfHtml($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods);

            \Log::info('HTML generado para PDF', ['html_length' => strlen($html)]);

            // Generar PDF
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHtml($html);
            $pdf->setPaper('A4', 'portrait');

            // Generar nombre del archivo con timestamp
            $fileName = 'reporte-ventas-' . now()->format('Y-m-d-H-i-s') . '.pdf';

            \Log::info('PDF generado exitosamente', ['file_name' => $fileName]);

            // Retornar PDF para descarga
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            \Log::error('Error en exportación PDF: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Error al generar el reporte PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Exportar reporte a Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            \Log::info('Iniciando exportación CSV', ['request' => $request->all()]);

            $filters = $this->getFilters($request);
            \Log::info('Filtros aplicados', $filters);

            // Obtener datos para el reporte
            $salesData = $this->getSalesByPeriod($filters, 'day');
            $topProducts = $this->getTopProducts($filters, 50);
            $salesByBranch = $this->getSalesByBranch($filters);
            $salesBySeller = $this->getSalesBySeller($filters);
            $returnsData = $this->getReturnsByProduct($filters);
            $paymentMethods = $this->getPaymentMethodsSummary($filters);

            \Log::info('Datos obtenidos', [
                'sales_count' => count($salesData),
                'products_count' => count($topProducts),
                'branches_count' => count($salesByBranch),
                'sellers_count' => count($salesBySeller),
                'returns_count' => count($returnsData),
                'payment_methods_count' => count($paymentMethods)
            ]);

            // Crear el contenido del CSV
            $csvContent = $this->generateCsvContent($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods);

            // Generar nombre del archivo con timestamp
            $fileName = 'reporte-ventas-' . now()->format('Y-m-d-H-i-s') . '.csv';

            \Log::info('CSV generado exitosamente', ['file_size' => strlen($csvContent)]);

            // Retornar respuesta con headers para descarga
            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"')
                ->header('Cache-Control', 'no-cache, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error en exportación CSV: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Error al generar el reporte CSV: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obtener resumen de ventas
     */
    private function getSalesSummary($filters)
    {
        $cacheKey = 'sales_summary_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            $summary = $query->select([
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('SUM(total) as total_amount'),
                DB::raw('SUM(net) as net_amount'),
                DB::raw('SUM(tax) as tax_amount'),
                DB::raw('AVG(total) as average_sale'),
                DB::raw('SUM(amount_paid) as total_paid'),
            ])->first();

            // Comparación con período anterior
            $previousPeriod = $this->getPreviousPeriod($filters);
            $previousQuery = Sale::query();
            $this->applyFilters($previousQuery, $previousPeriod);

            $previousSummary = $previousQuery->select([
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('SUM(total) as total_amount'),
            ])->first();

            return [
                'current' => [
                    'total_sales' => (int) ($summary->total_sales ?? 0),
                    'total_amount' => (float) ($summary->total_amount ?? 0),
                    'net_amount' => (float) ($summary->net_amount ?? 0),
                    'tax_amount' => (float) ($summary->tax_amount ?? 0),
                    'average_sale' => (float) ($summary->average_sale ?? 0),
                    'total_paid' => (float) ($summary->total_paid ?? 0),
                ],
                'previous' => [
                    'total_sales' => (int) ($previousSummary->total_sales ?? 0),
                    'total_amount' => (float) ($previousSummary->total_amount ?? 0),
                ],
                'growth' => [
                    'sales_count' => $this->calculateGrowth($summary->total_sales ?? 0, $previousSummary->total_sales ?? 0),
                    'total_amount' => $this->calculateGrowth($summary->total_amount ?? 0, $previousSummary->total_amount ?? 0),
                ],
            ];
        });
    }

    /**
     * Obtener productos más vendidos
     */
    private function getTopProducts($filters, $limit = 10)
    {
        $cacheKey = 'top_products_' . md5(serialize($filters)) . '_' . $limit;

        return Cache::remember($cacheKey, 900, function () use ($filters, $limit) {
            $results = DB::table('sales')
                ->join('sale_products', 'sales.id', '=', 'sale_products.sale_id')
                ->join('products', 'sale_products.product_id', '=', 'products.id')
                ->where('sales.status', 'completed')
                ->when($filters['date_from'], function ($query, $date) {
                    return $query->whereDate('sales.date', '>=', $date);
                })
                ->when($filters['date_to'], function ($query, $date) {
                    return $query->whereDate('sales.date', '<=', $date);
                })
                ->when($filters['branch_id'], function ($query, $branchId) {
                    return $query->where('sales.branch_id', $branchId);
                })
                ->select([
                    'products.id',
                    'products.name',
                    'products.code',
                    DB::raw('SUM(sale_products.quantity) as total_quantity'),
                    DB::raw('COALESCE(SUM(sale_products.subtotal), 0) as total_amount'),
                    DB::raw('COUNT(DISTINCT sales.id) as sales_count'),
                ])
                ->groupBy('products.id', 'products.name', 'products.code')
                ->orderBy('total_quantity', 'desc')
                ->limit($limit)
                ->get();

            // Convertir explícitamente los valores a números pero mantener como objetos
            return $results->map(function ($item) {
                $item->id = (int) $item->id;
                $item->total_quantity = (int) $item->total_quantity;
                $item->total_amount = (float) $item->total_amount;
                $item->sales_count = (int) $item->sales_count;
                return $item;
            });
        });
    }

    /**
     * Obtener ventas por sucursal
     */
    private function getSalesByBranch($filters)
    {
        $cacheKey = 'sales_by_branch_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select([
                    'branches.id',
                    'branches.name',
                    'branches.business_name',
                    DB::raw('COUNT(*) as total_sales'),
                    DB::raw('SUM(sales.total) as total_amount'),
                    DB::raw('AVG(sales.total) as average_sale'),
                ])
                ->groupBy('branches.id', 'branches.name', 'branches.business_name')
                ->orderBy('total_amount', 'desc')
                ->get();
        });
    }

    /**
     * Obtener ventas por vendedor
     */
    private function getSalesBySeller($filters)
    {
        $cacheKey = 'sales_by_seller_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->join('users', 'sales.seller_id', '=', 'users.id')
                ->select([
                    'users.id',
                    'users.name',
                    'users.email',
                    DB::raw('COUNT(*) as total_sales'),
                    DB::raw('SUM(sales.total) as total_amount'),
                    DB::raw('AVG(sales.total) as average_sale'),
                ])
                ->groupBy('users.id', 'users.name', 'users.email')
                ->orderBy('total_amount', 'desc')
                ->limit(10)
                ->get();
        });
    }

    /**
     * Obtener resumen de devoluciones
     */
    private function getReturnsSummary($filters)
    {
        $cacheKey = 'returns_summary_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = SaleReturn::query();

            if ($filters['date_from']) {
                $query->whereDate('sale_returns.created_at', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->whereDate('sale_returns.created_at', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $query->whereHas('sale', function ($q) use ($filters) {
                    $q->where('branch_id', $filters['branch_id']);
                });
            }

            $summary = $query->select([
                DB::raw('COUNT(*) as total_returns'),
                DB::raw('COUNT(DISTINCT sale_id) as unique_sales_returned'),
            ])->first();

            // Calcular montos totales de devoluciones
            $amountsQuery = SaleReturn::query();

            if ($filters['date_from']) {
                $amountsQuery->whereDate('sale_returns.created_at', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $amountsQuery->whereDate('sale_returns.created_at', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $amountsQuery->whereHas('sale', function ($q) use ($filters) {
                    $q->where('branch_id', $filters['branch_id']);
                });
            }

            $amounts = $amountsQuery->join('sale_return_products', 'sale_returns.id', '=', 'sale_return_products.sale_return_id')
                ->join('products', 'sale_return_products.product_id', '=', 'products.id')
                ->select([
                    DB::raw('SUM(sale_return_products.quantity * products.sale_price) as total_amount'),
                    DB::raw('AVG(sale_return_products.quantity * products.sale_price) as average_return'),
                ])->first();

            return (object) [
                'total_returns' => $summary->total_returns ?? 0,
                'unique_sales_returned' => $summary->unique_sales_returned ?? 0,
                'total_amount' => $amounts->total_amount ?? 0,
                'average_return' => $amounts->average_return ?? 0,
            ];
        });
    }

    /**
     * Obtener ventas por período
     */
    private function getSalesByPeriod($filters, $groupBy = 'day')
    {
        $cacheKey = 'sales_by_period_' . md5(serialize($filters)) . '_' . $groupBy;

        return Cache::remember($cacheKey, 900, function () use ($filters, $groupBy) {
            $query = Sale::query();
            
            // Aplicar filtros básicos sin el filtro de status
            if ($filters['date_from']) {
                $query->whereDate('sales.date', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->whereDate('sales.date', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $query->where('sales.branch_id', $filters['branch_id']);
            }
            if ($filters['seller_id']) {
                $query->where('sales.seller_id', $filters['seller_id']);
            }
            if ($filters['category_id']) {
                $query->whereHas('saleProducts.product', function ($q) use ($filters) {
                    $q->where('category_id', $filters['category_id']);
                });
            }
            
            // Para el detalle de ventas, incluir tanto completed como cancelled
            $query->whereIn('sales.status', ['completed', 'cancelled']);

            $dateFormat = $this->getDateFormat($groupBy);

            $result = $query->select([
                DB::raw("DATE_FORMAT(sales.date, '{$dateFormat}') as period"),
                'sales.status',
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('COALESCE(SUM(sales.total), 0) as total_amount'),
                DB::raw('COALESCE(SUM(sales.net), 0) as net_amount'),
                DB::raw('COALESCE(SUM(sales.tax), 0) as tax_amount'),
                DB::raw('COALESCE(AVG(sales.total), 0) as average_sale'),
            ])
                ->groupBy('period', 'sales.status')
                ->orderBy('period')
                ->orderBy('sales.status')
                ->get()
                ->groupBy('period')
                ->map(function ($periodGroup) {
                    $result = [
                        'period' => $periodGroup->first()->period,
                        'completed' => [
                            'total_sales' => 0,
                            'total_amount' => 0,
                            'net_amount' => 0,
                            'tax_amount' => 0,
                            'average_sale' => 0,
                        ],
                        'cancelled' => [
                            'total_sales' => 0,
                            'total_amount' => 0,
                            'net_amount' => 0,
                            'tax_amount' => 0,
                            'average_sale' => 0,
                        ],
                        'pending' => [
                            'total_sales' => 0,
                            'total_amount' => 0,
                            'net_amount' => 0,
                            'tax_amount' => 0,
                            'average_sale' => 0,
                        ],
                    ];
                    
                    foreach ($periodGroup as $item) {
                        $status = $item->status;
                        $result[$status] = [
                            'total_sales' => (int) $item->total_sales,
                            'total_amount' => (float) $item->total_amount,
                            'net_amount' => (float) $item->net_amount,
                            'tax_amount' => (float) $item->tax_amount,
                            'average_sale' => (float) $item->average_sale,
                        ];
                    }
                    
                    return $result;
                })
                ->values();

            return $result;
        });
    }

    /**
     * Obtener productos por categoría
     */
    private function getProductsByCategory($filters)
    {
        $cacheKey = 'products_by_category_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $results = DB::table('sales')
                ->join('sale_products', 'sales.id', '=', 'sale_products.sale_id')
                ->join('products', 'sale_products.product_id', '=', 'products.id')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->where('sales.status', 'completed')
                ->when($filters['date_from'], function ($query, $date) {
                    return $query->whereDate('sales.date', '>=', $date);
                })
                ->when($filters['date_to'], function ($query, $date) {
                    return $query->whereDate('sales.date', '<=', $date);
                })
                ->when($filters['branch_id'], function ($query, $branchId) {
                    return $query->where('sales.branch_id', $branchId);
                })
                ->select([
                    'categories.id',
                    'categories.name',
                    DB::raw('SUM(sale_products.quantity) as total_quantity'),
                    DB::raw('SUM(sale_products.subtotal) as total_amount'),
                    DB::raw('COUNT(DISTINCT products.id) as unique_products'),
                ])
                ->groupBy('categories.id', 'categories.name')
                ->orderBy('total_amount', 'desc')
                ->get();

            // Convertir explícitamente los valores a números
            return $results->map(function ($item) {
                return [
                    'id' => (int) $item->id,
                    'name' => $item->name,
                    'total_quantity' => (int) $item->total_quantity,
                    'total_amount' => (float) $item->total_amount,
                    'unique_products' => (int) $item->unique_products,
                ];
            });
        });
    }

    /**
     * Obtener productos con bajo stock
     */
    private function getLowStockProducts($filters = [])
    {
        $cacheKey = 'low_stock_products_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Product::where('stock', '<=', DB::raw('min_stock'))
                ->where('status', true);

            // Aplicar filtro de sucursal si está especificado
            if (!empty($filters['branch_id'])) {
                $query->whereHas('stockMovements', function ($q) use ($filters) {
                    $q->where('branch_id', (int) $filters['branch_id']);
                });
            }

            $results = $query->select(['id', 'name', 'code', 'stock', 'min_stock'])
                ->orderBy('stock')
                ->limit(20)
                ->get();

            return $results;
        });
    }

    /**
     * Obtener rendimiento de productos
     */
    private function getProductsPerformance($filters)
    {
        $cacheKey = 'products_performance_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $results = DB::table('products')
                ->leftJoin('sale_products', 'products.id', '=', 'sale_products.product_id')
                ->leftJoin('sales', 'sale_products.sale_id', '=', 'sales.id')
                ->where('products.status', true)
                ->when($filters['date_from'], function ($query, $date) {
                    return $query->whereDate('sales.date', '>=', $date);
                })
                ->when($filters['date_to'], function ($query, $date) {
                    return $query->whereDate('sales.date', '<=', $date);
                })
                ->select([
                    'products.id',
                    'products.name',
                    'products.code',
                    'products.stock',
                    'products.sale_price',
                    DB::raw('COALESCE(SUM(sale_products.quantity), 0) as sold_quantity'),
                    DB::raw('COALESCE(SUM(sale_products.subtotal), 0) as sold_amount'),
                    DB::raw('(products.stock + COALESCE(SUM(sale_products.quantity), 0)) as total_quantity'),
                ])
                ->groupBy('products.id', 'products.name', 'products.code', 'products.stock', 'products.sale_price')
                ->orderBy('sold_amount', 'desc')
                ->limit(50)
                ->get();

            // Convertir explícitamente los valores a números
            return $results->map(function ($item) {
                return [
                    'id' => (int) $item->id,
                    'name' => $item->name,
                    'code' => $item->code,
                    'stock' => (int) $item->stock,
                    'sale_price' => (float) $item->sale_price,
                    'sold_quantity' => (int) $item->sold_quantity,
                    'sold_amount' => (float) $item->sold_amount,
                    'total_quantity' => (int) $item->total_quantity,
                ];
            });
        });
    }

    /**
     * Obtener rendimiento de vendedores
     */
    private function getSellersPerformance($filters)
    {
        $cacheKey = 'sellers_performance_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            $result = $query->join('users', 'sales.seller_id', '=', 'users.id')
                ->select([
                    'users.id',
                    'users.name',
                    'users.email',
                    DB::raw('COUNT(*) as total_sales'),
                    DB::raw('CAST(SUM(sales.total) AS DECIMAL(15,2)) as total_amount'),
                    DB::raw('CAST(AVG(sales.total) AS DECIMAL(15,2)) as average_sale'),
                    DB::raw('MIN(sales.date) as first_sale'),
                    DB::raw('MAX(sales.date) as last_sale'),
                ])
                ->groupBy('users.id', 'users.name', 'users.email')
                ->orderBy('total_amount', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'email' => $item->email,
                        'total_sales' => (int) $item->total_sales,
                        'total_amount' => (float) $item->total_amount,
                        'average_sale' => (float) $item->average_sale,
                        'first_sale' => $item->first_sale,
                        'last_sale' => $item->last_sale,
                    ];
                });



            return $result;
        });
    }

    /**
     * Obtener comparación de vendedores
     */
    private function getSellersComparison($filters)
    {
        $cacheKey = 'sellers_comparison_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            // Obtener período actual
            $currentPeriod = $this->getSellersPerformance($filters);

            // Obtener período anterior
            $previousFilters = $this->getPreviousPeriod($filters);
            $previousPeriod = $this->getSellersPerformance($previousFilters);

            $result = [];

            foreach ($currentPeriod as $current) {
                $previous = collect($previousPeriod)->where('id', $current['id'])->first();
                $previousSales = $previous ? $previous['total_sales'] : 0;
                $currentSales = $current['total_sales'];

                $growthPercentage = $previousSales > 0
                    ? (($currentSales - $previousSales) / $previousSales) * 100
                    : 0;

                $result[] = [
                    'id' => $current['id'],
                    'name' => $current['name'],
                    'current_period_sales' => $currentSales,
                    'previous_period_sales' => $previousSales,
                    'growth_percentage' => round($growthPercentage, 2),
                ];
            }

            return collect($result);
        });
    }

    /**
     * Obtener vendedores por sucursal
     */
    private function getSellersByBranch($filters)
    {
        $cacheKey = 'sellers_by_branch_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->join('users', 'sales.seller_id', '=', 'users.id')
                ->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select([
                    'users.id',
                    'users.name',
                    'users.email',
                    'branches.name as branch_name',
                    DB::raw('COUNT(*) as total_sales'),
                    DB::raw('SUM(sales.total) as total_amount'),
                ])
                ->groupBy('users.id', 'users.name', 'users.email', 'branches.name')
                ->orderBy('branches.name')
                ->orderBy('total_amount', 'desc')
                ->get();
        });
    }

    /**
     * Obtener rendimiento de sucursales
     */
    private function getBranchesPerformance($filters)
    {
        $cacheKey = 'branches_performance_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select([
                    'branches.id',
                    'branches.name',
                    'branches.business_name',
                    'branches.address',
                    DB::raw('COUNT(*) as total_sales'),
                    DB::raw('SUM(sales.total) as total_amount'),
                    DB::raw('AVG(sales.total) as average_sale'),
                    DB::raw('COUNT(DISTINCT sales.seller_id) as active_sellers'),
                ])
                ->groupBy('branches.id', 'branches.name', 'branches.business_name', 'branches.address')
                ->orderBy('total_amount', 'desc')
                ->get();
        });
    }

    /**
     * Obtener comparación de sucursales
     */
    private function getBranchesComparison($filters)
    {
        $cacheKey = 'branches_comparison_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->join('branches', 'sales.branch_id', '=', 'branches.id')
                ->select([
                    'branches.id',
                    'branches.name',
                    DB::raw('COUNT(*) as sales_count'),
                    DB::raw('SUM(sales.total) as total_amount'),
                    DB::raw('AVG(sales.total) as average_sale'),
                    DB::raw('COUNT(DISTINCT DATE(sales.date)) as active_days'),
                ])
                ->groupBy('branches.id', 'branches.name')
                ->having('sales_count', '>', 0)
                ->orderBy('total_amount', 'desc')
                ->get();
        });
    }

    /**
     * Obtener sucursales por región (placeholder)
     */
    private function getBranchesByRegion($filters)
    {
        // Implementar cuando se agregue campo región a branches
        return collect();
    }

    /**
     * Obtener devoluciones por producto
     */
    private function getReturnsByProduct($filters)
    {
        $cacheKey = 'returns_by_product_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = SaleReturn::query();

            if ($filters['date_from']) {
                $query->whereDate('sale_returns.created_at', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->whereDate('sale_returns.created_at', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $query->whereHas('sale', function ($q) use ($filters) {
                    $q->where('branch_id', $filters['branch_id']);
                });
            }

            return $query->join('sale_return_products', 'sale_returns.id', '=', 'sale_return_products.sale_return_id')
                ->join('products', 'sale_return_products.product_id', '=', 'products.id')
                ->select([
                    'products.id',
                    'products.name',
                    'products.code',
                    DB::raw('SUM(sale_return_products.quantity) as returned_quantity'),
                    DB::raw('COUNT(DISTINCT sale_returns.id) as return_count'),
                    DB::raw('SUM(sale_return_products.quantity * products.sale_price) as total_amount'),
                ])
                ->groupBy('products.id', 'products.name', 'products.code')
                ->orderBy('returned_quantity', 'desc')
                ->limit(20)
                ->get();
        });
    }

    /**
     * Obtener devoluciones por razón
     */
    private function getReturnsByReason($filters)
    {
        $cacheKey = 'returns_by_reason_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = SaleReturn::query();

            if ($filters['date_from']) {
                $query->whereDate('sale_returns.created_at', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->whereDate('sale_returns.created_at', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $query->whereHas('sale', function ($q) use ($filters) {
                    $q->where('branch_id', $filters['branch_id']);
                });
            }

            return $query->join('sale_return_products', 'sale_returns.id', '=', 'sale_return_products.sale_return_id')
                ->join('products', 'sale_return_products.product_id', '=', 'products.id')
                ->select([
                    DB::raw('COALESCE(sale_returns.reason, "Sin motivo") as reason'),
                    DB::raw('COUNT(DISTINCT sale_returns.id) as return_count'),
                    DB::raw('SUM(sale_return_products.quantity * products.sale_price) as total_amount'),
                ])
                ->groupBy('reason')
                ->orderBy('return_count', 'desc')
                ->get();
        });
    }

    /**
     * Obtener tendencia de devoluciones
     */
    private function getReturnsTrend($filters)
    {
        $cacheKey = 'returns_trend_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = SaleReturn::query();

            if ($filters['date_from']) {
                $query->whereDate('sale_returns.created_at', '>=', $filters['date_from']);
            }
            if ($filters['date_to']) {
                $query->whereDate('sale_returns.created_at', '<=', $filters['date_to']);
            }
            if ($filters['branch_id']) {
                $query->whereHas('sale', function ($q) use ($filters) {
                    $q->where('branch_id', $filters['branch_id']);
                });
            }

            return $query->join('sale_return_products', 'sale_returns.id', '=', 'sale_return_products.sale_return_id')
                ->join('products', 'sale_return_products.product_id', '=', 'products.id')
                ->select([
                    DB::raw('DATE(sale_returns.created_at) as date'),
                    DB::raw('COUNT(DISTINCT sale_returns.id) as return_count'),
                    DB::raw('SUM(sale_return_products.quantity * products.sale_price) as return_amount'),
                ])
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        });
    }

    /**
     * Obtener resumen de métodos de pago
     */
    private function getPaymentMethodsSummary($filters)
    {
        $cacheKey = 'payment_methods_summary_' . md5(serialize($filters));

        return Cache::remember($cacheKey, 900, function () use ($filters) {
            $query = Sale::query();
            $this->applyFilters($query, $filters);

            return $query->select([
                'sales.payment_method',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(sales.total) as total_amount'),
                DB::raw('AVG(sales.total) as average_amount'),
            ])
                ->groupBy('sales.payment_method')
                ->orderBy('total_amount', 'desc')
                ->get();
        });
    }

    /**
     * Aplicar filtros a la consulta
     */
    private function applyFilters($query, $filters)
    {
        if ($filters['date_from']) {
            $query->whereDate('sales.date', '>=', $filters['date_from']);
        }
        if ($filters['date_to']) {
            $query->whereDate('sales.date', '<=', $filters['date_to']);
        }
        if ($filters['branch_id']) {
            $query->where('sales.branch_id', $filters['branch_id']);
        }
        if ($filters['seller_id']) {
            $query->where('sales.seller_id', $filters['seller_id']);
        }
        if ($filters['category_id']) {
            $query->whereHas('saleProducts.product', function ($q) use ($filters) {
                $q->where('category_id', $filters['category_id']);
            });
        }
        if ($filters['status']) {
            $query->where('sales.status', $filters['status']);
        } else {
            $query->where('sales.status', 'completed');
        }

        return $query;
    }

    /**
     * Obtener filtros de la request
     */
    private function getFilters(Request $request)
    {
        $user = Auth::user();

        $filters = [
            'date_from' => $request->get('date_from'),
            'date_to' => $request->get('date_to'),
            'branch_id' => $request->get('branch_id'),
            'seller_id' => $request->get('seller_id'),
            'category_id' => $request->get('category_id'),
            'status' => $request->get('status', 'completed'),
        ];

        // Si el usuario no es administrador, forzar el filtro de sucursal
        if (!$user->isAdmin() && $user->branch_id) {
            $filters['branch_id'] = $user->branch_id;
        }

        // Si no hay fechas específicas, usar el mes actual por defecto
        if (!$filters['date_from'] && !$filters['date_to']) {
            $now = now();
            $filters['date_from'] = $now->startOfMonth()->format('Y-m-d');
            $filters['date_to'] = $now->endOfMonth()->format('Y-m-d');
            \Log::info('Fechas por defecto aplicadas', [
                'date_from' => $filters['date_from'],
                'date_to' => $filters['date_to']
            ]);
        }

        \Log::info('Filtros procesados', $filters);
        return $filters;
    }

    /**
     * Obtener período anterior para comparación
     */
    private function getPreviousPeriod($filters)
    {
        $dateFrom = $filters['date_from'] ? Carbon::parse($filters['date_from']) : Carbon::now()->subMonth();
        $dateTo = $filters['date_to'] ? Carbon::parse($filters['date_to']) : Carbon::now();

        $duration = $dateFrom->diffInDays($dateTo);

        return [
            'date_from' => $dateFrom->subDays($duration)->format('Y-m-d'),
            'date_to' => $dateFrom->format('Y-m-d'),
            'branch_id' => $filters['branch_id'],
            'seller_id' => $filters['seller_id'],
            'category_id' => $filters['category_id'],
            'status' => $filters['status'],
        ];
    }

    /**
     * Calcular crecimiento porcentual
     */
    private function calculateGrowth($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 2);
    }

    /**
     * Obtener formato de fecha para agrupación
     */
    private function getDateFormat($groupBy)
    {
        switch ($groupBy) {
            case 'day':
                return '%Y-%m-%d';
            case 'week':
                return '%Y-%u';
            case 'month':
                return '%Y-%m';
            case 'year':
                return '%Y';
            default:
                return '%Y-%m-%d';
        }
    }

    /**
     * Generar contenido CSV para exportación
     */
    private function generateCsvContent($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods)
    {
        $csv = [];

        // Encabezado del reporte con formato mejorado
        $csv[] = ['REPORTE DE VENTAS - STOKITY V2'];
        $csv[] = ['Sistema de Gestión de Inventario y Ventas'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        // Resumen ejecutivo
        $totalSales = collect($salesData)->sum('total_sales');
        $totalAmount = collect($salesData)->sum('total_amount');
        $avgSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $csv[] = ['RESUMEN EJECUTIVO'];
        $csv[] = ['Total de Ventas:', $totalSales];
        $csv[] = ['Monto Total:', '$ ' . number_format($totalAmount, 2, ',', '.')];
        $csv[] = ['Promedio por Venta:', '$ ' . number_format($avgSale, 2, ',', '.')];
        $csv[] = [];

        // Filtros aplicados
        $csv[] = ['FILTROS APLICADOS'];
        $hasFilters = false;
        if ($filters['date_from']) {
            $csv[] = ['Fecha desde:', $filters['date_from']];
            $hasFilters = true;
        }
        if ($filters['date_to']) {
            $csv[] = ['Fecha hasta:', $filters['date_to']];
            $hasFilters = true;
        }
        if ($filters['branch_id']) {
            $csv[] = ['Sucursal ID:', $filters['branch_id']];
            $hasFilters = true;
        }
        if ($filters['category_id']) {
            $csv[] = ['Categoría ID:', $filters['category_id']];
            $hasFilters = true;
        }
        if (!$hasFilters) {
            $csv[] = ['Sin filtros aplicados (todos los datos)'];
        }
        $csv[] = [];

        // Ventas por período con formato mejorado
        if (count($salesData) > 0) {
            $csv[] = ['VENTAS POR PERÍODO'];
            $csv[] = [
                'Fecha',
                'Ventas Completadas', 'Monto Completadas', 'Neto Completadas', 'Imp. Completadas', 'Prom. Completadas',
                'Ventas Canceladas', 'Monto Canceladas', 'Neto Canceladas', 'Imp. Canceladas', 'Prom. Canceladas',
                'Ventas Pendientes', 'Monto Pendientes', 'Neto Pendientes', 'Imp. Pendientes', 'Prom. Pendientes',
            ];
            foreach ($salesData as $sale) {
                $csv[] = [
                    $sale['period'],
                    $sale['completed']['total_sales'],
                    '$ ' . number_format($sale['completed']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['average_sale'], 2, ',', '.'),
                    $sale['cancelled']['total_sales'],
                    '$ ' . number_format($sale['cancelled']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['average_sale'], 2, ',', '.'),
                    $sale['pending']['total_sales'],
                    '$ ' . number_format($sale['pending']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['average_sale'], 2, ',', '.'),
                ];
            }
            $csv[] = [];
        }

        // Productos más vendidos con formato mejorado
        if (count($topProducts) > 0) {
            $csv[] = ['PRODUCTOS MÁS VENDIDOS'];
            $csv[] = ['Código', 'Nombre del Producto', 'Cantidad Vendida', 'Monto Total', 'Número de Ventas'];
            $csv[] = ['', '', '', '', ''];

            foreach ($topProducts as $product) {
                $csv[] = [
                    $product->code,
                    $product->name,
                    $product->total_quantity,
                    '$ ' . number_format($product->total_amount, 2, ',', '.'),
                    $product->sales_count
                ];
            }
            $csv[] = [];
        }

        // Ventas por sucursal con formato mejorado
        if (count($salesByBranch) > 0) {
            $csv[] = ['VENTAS POR SUCURSAL'];
            $csv[] = ['ID', 'Nombre de Sucursal', 'Nombre Comercial', 'Total Ventas', 'Monto Total', 'Promedio por Venta'];
            $csv[] = ['', '', '', '', '', ''];

            foreach ($salesByBranch as $branch) {
                $csv[] = [
                    $branch->id,
                    $branch->name,
                    $branch->business_name ?? 'N/A',
                    $branch->total_sales,
                    '$ ' . number_format($branch->total_amount, 2, ',', '.'),
                    '$ ' . number_format($branch->average_sale, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        // Ventas por vendedor con formato mejorado
        if (count($salesBySeller) > 0) {
            $csv[] = ['VENTAS POR VENDEDOR'];
            $csv[] = ['ID', 'Nombre del Vendedor', 'Email', 'Total Ventas', 'Monto Total', 'Promedio por Venta'];
            $csv[] = ['', '', '', '', '', ''];

            foreach ($salesBySeller as $seller) {
                $csv[] = [
                    $seller->id,
                    $seller->name,
                    $seller->email,
                    $seller->total_sales,
                    '$ ' . number_format($seller->total_amount, 2, ',', '.'),
                    '$ ' . number_format($seller->average_sale, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        // Devoluciones por producto con formato mejorado
        if (count($returnsData) > 0) {
            $csv[] = ['DEVOLUCIONES POR PRODUCTO'];
            $csv[] = ['ID', 'Código', 'Nombre del Producto', 'Cantidad Devuelta', 'Número de Devoluciones'];
            $csv[] = ['', '', '', '', ''];

            foreach ($returnsData as $return) {
                $csv[] = [
                    $return->id,
                    $return->code,
                    $return->name,
                    $return->returned_quantity,
                    $return->return_count
                ];
            }
            $csv[] = [];
        }

        // Métodos de pago con formato mejorado
        if (count($paymentMethods) > 0) {
            $csv[] = ['MÉTODOS DE PAGO'];
            $csv[] = ['Método de Pago', 'Número de Transacciones', 'Monto Total', 'Promedio por Transacción'];
            $csv[] = ['', '', '', ''];

            foreach ($paymentMethods as $method) {
                $csv[] = [
                    ucfirst(str_replace('_', ' ', $method->payment_method)),
                    $method->transaction_count,
                    '$ ' . number_format($method->total_amount, 2, ',', '.'),
                    '$ ' . number_format($method->average_amount, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        // Pie de página
        $csv[] = ['FIN DEL REPORTE'];
        $csv[] = ['Este reporte fue generado automáticamente por Stokity V2'];
        $csv[] = ['Para más información, contacte al administrador del sistema'];

        // Convertir array a CSV con formato mejorado
        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            // Asegurar que todos los valores sean strings y manejar caracteres especiales
            $cleanRow = array_map(function ($value) {
                if (is_null($value)) return '';
                if (is_numeric($value)) return (string)$value;
                return (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';'); // Usar punto y coma como separador para Excel
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        // Asegurar que el contenido tenga BOM para UTF-8
        return "\xEF\xBB\xBF" . $csvContent;
    }

    /**
     * Generar contenido HTML para PDF
     */
    private function generatePdfHtml($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods)
    {
        $totalSales = collect($salesData)->sum('total_sales');
        $totalAmount = collect($salesData)->sum('total_amount');
        $avgSale = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Ventas - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .header p { margin: 5px 0; color: #7f8c8d; }
                .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .summary h2 { color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; }
                .summary-grid { display: flex; justify-content: space-between; }
                .summary-item { text-align: center; flex: 1; }
                .summary-item strong { display: block; font-size: 20px; color: #27ae60; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .filters { background: #ecf0f1; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .filters h3 { margin: 0 0 10px 0; color: #2c3e50; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
                .currency { text-align: right; }
                .number { text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE VENTAS - STOKITY V2</h1>
                <p>Sistema de Gestión de Inventario y Ventas</p>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        // Resumen ejecutivo
        $html .= '
            <div class="summary">
                <h2>RESUMEN EJECUTIVO</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>' . number_format($totalSales) . '</strong>
                        <span>Total de Ventas</span>
                    </div>
                    <div class="summary-item">
                        <strong>$ ' . number_format($totalAmount, 2, ',', '.') . '</strong>
                        <span>Monto Total</span>
                    </div>
                    <div class="summary-item">
                        <strong>$ ' . number_format($avgSale, 2, ',', '.') . '</strong>
                        <span>Promedio por Venta</span>
                    </div>
                </div>
            </div>';

        // Filtros aplicados
        $html .= '
            <div class="filters">
                <h3>FILTROS APLICADOS</h3>';

        $hasFilters = false;
        if ($filters['date_from']) {
            $html .= '<p><strong>Fecha desde:</strong> ' . $filters['date_from'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['date_to']) {
            $html .= '<p><strong>Fecha hasta:</strong> ' . $filters['date_to'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['branch_id']) {
            $html .= '<p><strong>Sucursal ID:</strong> ' . $filters['branch_id'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['category_id']) {
            $html .= '<p><strong>Categoría ID:</strong> ' . $filters['category_id'] . '</p>';
            $hasFilters = true;
        }
        if (!$hasFilters) {
            $html .= '<p>Sin filtros aplicados (todos los datos)</p>';
        }

        $html .= '</div>';

        // Ventas por período
        if (count($salesData) > 0) {
            $html .= '
            <div class="section">
                <h3>VENTAS POR PERÍODO</h3>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2">Fecha</th>
                            <th colspan="5" style="text-align: center;">Completadas</th>
                            <th colspan="5" style="text-align: center;">Canceladas</th>
                            <th colspan="5" style="text-align: center;">Pendientes</th>
                        </tr>
                        <tr>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($salesData as $sale) {
                $html .= '
                        <tr>
                            <td>' . $sale['period'] . '</td>
                            <td class="number">' . $sale['completed']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['average_sale'], 2, ',', '.') . '</td>
                            <td class="number">' . $sale['cancelled']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['average_sale'], 2, ',', '.') . '</td>
                            <td class="number">' . $sale['pending']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['average_sale'], 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        // Productos más vendidos
        if (count($topProducts) > 0) {
            $html .= '
            <div class="section">
                <h3>PRODUCTOS MÁS VENDIDOS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre del Producto</th>
                            <th class="number">Cantidad Vendida</th>
                            <th class="currency">Monto Total</th>
                            <th class="number">Número de Ventas</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($topProducts as $product) {
                $html .= '
                        <tr>
                            <td>' . $product->code . '</td>
                            <td>' . $product->name . '</td>
                            <td class="number">' . $product->total_quantity . '</td>
                            <td class="currency">$ ' . number_format($product->total_amount, 2, ',', '.') . '</td>
                            <td class="number">' . $product->sales_count . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        // Ventas por sucursal
        if (count($salesByBranch) > 0) {
            $html .= '
            <div class="section">
                <h3>VENTAS POR SUCURSAL</h3>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre de Sucursal</th>
                            <th>Nombre Comercial</th>
                            <th class="number">Total Ventas</th>
                            <th class="currency">Monto Total</th>
                            <th class="currency">Promedio por Venta</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($salesByBranch as $branch) {
                $html .= '
                        <tr>
                            <td>' . $branch->id . '</td>
                            <td>' . $branch->name . '</td>
                            <td>' . ($branch->business_name ?? 'N/A') . '</td>
                            <td class="number">' . $branch->total_sales . '</td>
                            <td class="currency">$ ' . number_format($branch->total_amount, 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($branch->average_sale, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        // Ventas por vendedor
        if (count($salesBySeller) > 0) {
            $html .= '
            <div class="section">
                <h3>VENTAS POR VENDEDOR</h3>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre del Vendedor</th>
                            <th>Email</th>
                            <th class="number">Total Ventas</th>
                            <th class="currency">Monto Total</th>
                            <th class="currency">Promedio por Venta</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($salesBySeller as $seller) {
                $html .= '
                        <tr>
                            <td>' . $seller->id . '</td>
                            <td>' . $seller->name . '</td>
                            <td>' . $seller->email . '</td>
                            <td class="number">' . $seller->total_sales . '</td>
                            <td class="currency">$ ' . number_format($seller->total_amount, 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($seller->average_sale, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        // Devoluciones por producto
        if (count($returnsData) > 0) {
            $html .= '
            <div class="section">
                <h3>DEVOLUCIONES POR PRODUCTO</h3>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Código</th>
                            <th>Nombre del Producto</th>
                            <th class="number">Cantidad Devuelta</th>
                            <th class="number">Número de Devoluciones</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($returnsData as $return) {
                $html .= '
                        <tr>
                            <td>' . $return->id . '</td>
                            <td>' . $return->code . '</td>
                            <td>' . $return->name . '</td>
                            <td class="number">' . $return->returned_quantity . '</td>
                            <td class="number">' . $return->return_count . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        // Métodos de pago
        if (count($paymentMethods) > 0) {
            $html .= '
            <div class="section">
                <h3>MÉTODOS DE PAGO</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Método de Pago</th>
                            <th class="number">Número de Transacciones</th>
                            <th class="currency">Monto Total</th>
                            <th class="currency">Promedio por Transacción</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($paymentMethods as $method) {
                $html .= '
                        <tr>
                            <td>' . ucfirst(str_replace('_', ' ', $method->payment_method)) . '</td>
                            <td class="number">' . $method->transaction_count . '</td>
                            <td class="currency">$ ' . number_format($method->total_amount, 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($method->average_amount, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
                <p>Para más información, contacte al administrador del sistema</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    /**
     * Generar contenido HTML para PDF de sales-detail
     */
    private function generateSalesDetailPdfHtml($filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte Detallado de Ventas - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .header p { margin: 5px 0; color: #7f8c8d; }
                .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .summary h2 { color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; }
                .summary-grid { display: flex; justify-content: space-between; }
                .summary-item { text-align: center; flex: 1; }
                .summary-item strong { display: block; font-size: 20px; color: #27ae60; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .filters { background: #ecf0f1; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .filters h3 { margin: 0 0 10px 0; color: #2c3e50; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
                .currency { text-align: right; }
                .number { text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DETALLADO DE VENTAS - STOKITY V2</h1>
                <p>Sistema de Gestión de Inventario y Ventas</p>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        // Resumen ejecutivo
        $html .= '
            <div class="summary">
                <h2>RESUMEN EJECUTIVO</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>' . number_format($totalSales) . '</strong>
                        <span>Total de Ventas</span>
                    </div>
                    <div class="summary-item">
                        <strong>$ ' . number_format($totalAmount, 2, ',', '.') . '</strong>
                        <span>Monto Total</span>
                    </div>
                    <div class="summary-item">
                        <strong>$ ' . number_format($averageSale, 2, ',', '.') . '</strong>
                        <span>Promedio por Venta</span>
                    </div>
                </div>
            </div>';

        // Filtros aplicados
        $html .= '
            <div class="filters">
                <h3>FILTROS APLICADOS</h3>';

        $hasFilters = false;
        if ($filters['date_from']) {
            $html .= '<p><strong>Fecha desde:</strong> ' . $filters['date_from'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['date_to']) {
            $html .= '<p><strong>Fecha hasta:</strong> ' . $filters['date_to'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['branch_id']) {
            $html .= '<p><strong>Sucursal ID:</strong> ' . $filters['branch_id'] . '</p>';
            $hasFilters = true;
        }
        if ($filters['category_id']) {
            $html .= '<p><strong>Categoría ID:</strong> ' . $filters['category_id'] . '</p>';
            $hasFilters = true;
        }
        if (!$hasFilters) {
            $html .= '<p>Sin filtros aplicados (todos los datos)</p>';
        }

        $html .= '</div>';

        // Ventas por período
        if (count($salesData) > 0) {
            $html .= '
            <div class="section">
                <h3>VENTAS POR PERÍODO</h3>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2">Fecha</th>
                            <th colspan="5" style="text-align: center;">Completadas</th>
                            <th colspan="5" style="text-align: center;">Canceladas</th>
                            <th colspan="5" style="text-align: center;">Pendientes</th>
                        </tr>
                        <tr>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                            <th class="number">Ventas</th>
                            <th class="currency">Monto</th>
                            <th class="currency">Neto</th>
                            <th class="currency">Imp.</th>
                            <th class="currency">Prom.</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($salesData as $sale) {
                $html .= '
                        <tr>
                            <td>' . $sale['period'] . '</td>
                            <td class="number">' . $sale['completed']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['completed']['average_sale'], 2, ',', '.') . '</td>
                            <td class="number">' . $sale['cancelled']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['cancelled']['average_sale'], 2, ',', '.') . '</td>
                            <td class="number">' . $sale['pending']['total_sales'] . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['total_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['net_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['tax_amount'], 2, ',', '.') . '</td>
                            <td class="currency">$ ' . number_format($sale['pending']['average_sale'], 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
                <p>Para más información, contacte al administrador del sistema</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    /**
     * Generar contenido CSV para exportación de sales-detail
     */
    private function generateSalesDetailCsvContent($filters, $salesData, $totalSales, $totalAmount, $averageSale, $groupBy)
    {
        $csv = [];

        // Encabezado del reporte con formato mejorado
        $csv[] = ['REPORTE DETALLADO DE VENTAS - STOKITY V2'];
        $csv[] = ['Sistema de Gestión de Inventario y Ventas'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        // Resumen ejecutivo
        $csv[] = ['RESUMEN EJECUTIVO'];
        $csv[] = ['Total de Ventas:', $totalSales];
        $csv[] = ['Monto Total:', '$ ' . number_format($totalAmount, 2, ',', '.')];
        $csv[] = ['Promedio por Venta:', '$ ' . number_format($averageSale, 2, ',', '.')];
        $csv[] = [];

        // Filtros aplicados
        $csv[] = ['FILTROS APLICADOS'];
        $hasFilters = false;
        if ($filters['date_from']) {
            $csv[] = ['Fecha desde:', $filters['date_from']];
            $hasFilters = true;
        }
        if ($filters['date_to']) {
            $csv[] = ['Fecha hasta:', $filters['date_to']];
            $hasFilters = true;
        }
        if ($filters['branch_id']) {
            $csv[] = ['Sucursal ID:', $filters['branch_id']];
            $hasFilters = true;
        }
        if ($filters['category_id']) {
            $csv[] = ['Categoría ID:', $filters['category_id']];
            $hasFilters = true;
        }
        if (!$hasFilters) {
            $csv[] = ['Sin filtros aplicados (todos los datos)'];
        }
        $csv[] = [];

        // Ventas por período con formato mejorado
        if (count($salesData) > 0) {
            $csv[] = ['VENTAS POR PERÍODO'];
            $csv[] = [
                'Fecha',
                'Ventas Completadas', 'Monto Completadas', 'Neto Completadas', 'Imp. Completadas', 'Prom. Completadas',
                'Ventas Canceladas', 'Monto Canceladas', 'Neto Canceladas', 'Imp. Canceladas', 'Prom. Canceladas',
                'Ventas Pendientes', 'Monto Pendientes', 'Neto Pendientes', 'Imp. Pendientes', 'Prom. Pendientes',
            ];
            foreach ($salesData as $sale) {
                $csv[] = [
                    $sale['period'],
                    $sale['completed']['total_sales'],
                    '$ ' . number_format($sale['completed']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['completed']['average_sale'], 2, ',', '.'),
                    $sale['cancelled']['total_sales'],
                    '$ ' . number_format($sale['cancelled']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['cancelled']['average_sale'], 2, ',', '.'),
                    $sale['pending']['total_sales'],
                    '$ ' . number_format($sale['pending']['total_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['net_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['tax_amount'], 2, ',', '.'),
                    '$ ' . number_format($sale['pending']['average_sale'], 2, ',', '.'),
                ];
            }
            $csv[] = [];
        }

        // Pie de página
        $csv[] = ['FIN DEL REPORTE'];
        $csv[] = ['Este reporte fue generado automáticamente por Stokity V2'];
        $csv[] = ['Para más información, contacte al administrador del sistema'];

        // Convertir array a CSV con formato mejorado
        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            // Asegurar que todos los valores sean strings y manejar caracteres especiales
            $cleanRow = array_map(function ($value) {
                if (is_null($value)) return '';
                if (is_numeric($value)) return (string)$value;
                return (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';'); // Usar punto y coma como separador para Excel
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        // Asegurar que el contenido tenga BOM para UTF-8
        return "\xEF\xBB\xBF" . $csvContent;
    }

    // Métodos de exportación específicos para cada reporte

    /**
     * Exportar reporte de productos a PDF
     */
    public function exportProductsPdf(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $productsData = $this->getProductsPerformance($filters);
            $topProducts = $this->getTopProducts($filters, 10);
            $productsByCategory = $this->getProductsByCategory($filters);
            $lowStockProducts = $this->getLowStockProducts();

            $html = $this->generateProductsPdfHtml($filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts);

            $pdf = \PDF::loadHTML($html);
            $filename = 'reporte_productos_' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('Error exportando PDF de productos: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el PDF');
        }
    }

    /**
     * Exportar reporte de productos a Excel
     */
    public function exportProductsExcel(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $productsData = $this->getProductsPerformance($filters);
            $topProducts = $this->getTopProducts($filters, 10);
            $productsByCategory = $this->getProductsByCategory($filters);
            $lowStockProducts = $this->getLowStockProducts();

            $csvContent = $this->generateProductsCsvContent($filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts);

            $filename = 'reporte_productos_' . now()->format('Y-m-d_H-i-s') . '.csv';

            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error exportando Excel de productos: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el Excel');
        }
    }

    /**
     * Exportar reporte de vendedores a PDF
     */
    public function exportSellersPdf(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $sellersData = $this->getSellersPerformance($filters);
            $sellersComparison = $this->getSellersComparison($filters);
            $sellersByBranch = $this->getSellersByBranch($filters);

            $html = $this->generateSellersPdfHtml($filters, $sellersData, $sellersComparison, $sellersByBranch);

            $pdf = \PDF::loadHTML($html);
            $filename = 'reporte_vendedores_' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('Error exportando PDF de vendedores: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el PDF');
        }
    }

    /**
     * Exportar reporte de vendedores a Excel
     */
    public function exportSellersExcel(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $sellersData = $this->getSellersPerformance($filters);
            $sellersComparison = $this->getSellersComparison($filters);
            $sellersByBranch = $this->getSellersByBranch($filters);

            $csvContent = $this->generateSellersCsvContent($filters, $sellersData, $sellersComparison, $sellersByBranch);

            $filename = 'reporte_vendedores_' . now()->format('Y-m-d_H-i-s') . '.csv';

            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error exportando Excel de vendedores: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el Excel');
        }
    }

    /**
     * Exportar reporte de sucursales a PDF
     */
    public function exportBranchesPdf(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $branchesData = $this->getBranchesPerformance($filters);
            $branchesComparison = $this->getBranchesComparison($filters);
            $branchesByRegion = $this->getBranchesByRegion($filters);

            $html = $this->generateBranchesPdfHtml($filters, $branchesData, $branchesComparison, $branchesByRegion);

            $pdf = \PDF::loadHTML($html);
            $filename = 'reporte_sucursales_' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('Error exportando PDF de sucursales: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el PDF');
        }
    }

    /**
     * Exportar reporte de sucursales a Excel
     */
    public function exportBranchesExcel(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $branchesData = $this->getBranchesPerformance($filters);
            $branchesComparison = $this->getBranchesComparison($filters);
            $branchesByRegion = $this->getBranchesByRegion($filters);

            $csvContent = $this->generateBranchesCsvContent($filters, $branchesData, $branchesComparison, $branchesByRegion);

            $filename = 'reporte_sucursales_' . now()->format('Y-m-d_H-i-s') . '.csv';

            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error exportando Excel de sucursales: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el Excel');
        }
    }

    /**
     * Exportar reporte de devoluciones a PDF
     */
    public function exportReturnsPdf(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $returnsData = $this->getReturnsSummary($filters);
            $returnsByProduct = $this->getReturnsByProduct($filters);
            $returnsByReason = $this->getReturnsByReason($filters);
            $returnsTrend = $this->getReturnsTrend($filters);

            $html = $this->generateReturnsPdfHtml($filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend);

            $pdf = \PDF::loadHTML($html);
            $filename = 'reporte_devoluciones_' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('Error exportando PDF de devoluciones: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el PDF');
        }
    }

    /**
     * Exportar reporte de devoluciones a Excel
     */
    public function exportReturnsExcel(Request $request)
    {
        try {
            $filters = $this->getFilters($request);
            $returnsData = $this->getReturnsSummary($filters);
            $returnsByProduct = $this->getReturnsByProduct($filters);
            $returnsByReason = $this->getReturnsByReason($filters);
            $returnsTrend = $this->getReturnsTrend($filters);

            $csvContent = $this->generateReturnsCsvContent($filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend);

            $filename = 'reporte_devoluciones_' . now()->format('Y-m-d_H-i-s') . '.csv';

            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Expires', '0');
        } catch (\Exception $e) {
            \Log::error('Error exportando Excel de devoluciones: ' . $e->getMessage());
            return back()->with('error', 'Error al generar el Excel');
        }
    }

    // Métodos auxiliares para generar contenido HTML y CSV de cada reporte

    private function generateProductsPdfHtml($filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Productos - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE PRODUCTOS - STOKITY V2</h1>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        // Top productos
        if (count($topProducts) > 0) {
            $html .= '
            <div class="section">
                <h3>TOP PRODUCTOS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Ventas</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($topProducts as $product) {
                $html .= '
                        <tr>
                            <td>' . $product->name . '</td>
                            <td>' . $product->total_quantity . '</td>
                            <td>$ ' . number_format($product->total_amount, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    private function generateProductsCsvContent($filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts)
    {
        $csv = [];

        $csv[] = ['REPORTE DE PRODUCTOS - STOKITY V2'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        if (count($topProducts) > 0) {
            $csv[] = ['TOP PRODUCTOS'];
            $csv[] = ['Producto', 'Ventas', 'Monto'];

            foreach ($topProducts as $product) {
                $csv[] = [
                    $product->name,
                    $product->total_quantity,
                    '$ ' . number_format($product->total_amount, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        $csv[] = ['FIN DEL REPORTE'];

        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            $cleanRow = array_map(function ($value) {
                return is_null($value) ? '' : (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';');
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return "\xEF\xBB\xBF" . $csvContent;
    }

    private function generateSellersPdfHtml($filters, $sellersData, $sellersComparison, $sellersByBranch)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Vendedores - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE VENDEDORES - STOKITY V2</h1>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        if (count($sellersData) > 0) {
            $html .= '
            <div class="section">
                <h3>RENDIMIENTO DE VENDEDORES</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Vendedor</th>
                            <th>Ventas</th>
                            <th>Monto</th>
                            <th>Promedio</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($sellersData as $seller) {
                $html .= '
                        <tr>
                            <td>' . $seller->name . '</td>
                            <td>' . $seller->total_sales . '</td>
                            <td>$ ' . number_format($seller->total_amount, 2, ',', '.') . '</td>
                            <td>$ ' . number_format($seller->average_sale, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    private function generateSellersCsvContent($filters, $sellersData, $sellersComparison, $sellersByBranch)
    {
        $csv = [];

        $csv[] = ['REPORTE DE VENDEDORES - STOKITY V2'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        if (count($sellersData) > 0) {
            $csv[] = ['RENDIMIENTO DE VENDEDORES'];
            $csv[] = ['Vendedor', 'Ventas', 'Monto', 'Promedio'];

            foreach ($sellersData as $seller) {
                $csv[] = [
                    $seller->name,
                    $seller->total_sales,
                    '$ ' . number_format($seller->total_amount, 2, ',', '.'),
                    '$ ' . number_format($seller->average_sale, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        $csv[] = ['FIN DEL REPORTE'];

        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            $cleanRow = array_map(function ($value) {
                return is_null($value) ? '' : (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';');
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return "\xEF\xBB\xBF" . $csvContent;
    }

    private function generateBranchesPdfHtml($filters, $branchesData, $branchesComparison, $branchesByRegion)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Sucursales - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE SUCURSALES - STOKITY V2</h1>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        if (count($branchesData) > 0) {
            $html .= '
            <div class="section">
                <h3>RENDIMIENTO DE SUCURSALES</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Sucursal</th>
                            <th>Ventas</th>
                            <th>Monto</th>
                            <th>Promedio</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($branchesData as $branch) {
                $html .= '
                        <tr>
                            <td>' . $branch->name . '</td>
                            <td>' . $branch->total_sales . '</td>
                            <td>$ ' . number_format($branch->total_amount, 2, ',', '.') . '</td>
                            <td>$ ' . number_format($branch->average_sale, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    private function generateBranchesCsvContent($filters, $branchesData, $branchesComparison, $branchesByRegion)
    {
        $csv = [];

        $csv[] = ['REPORTE DE SUCURSALES - STOKITY V2'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        if (count($branchesData) > 0) {
            $csv[] = ['RENDIMIENTO DE SUCURSALES'];
            $csv[] = ['Sucursal', 'Ventas', 'Monto', 'Promedio'];

            foreach ($branchesData as $branch) {
                $csv[] = [
                    $branch->name,
                    $branch->total_sales,
                    '$ ' . number_format($branch->total_amount, 2, ',', '.'),
                    '$ ' . number_format($branch->average_sale, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        $csv[] = ['FIN DEL REPORTE'];

        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            $cleanRow = array_map(function ($value) {
                return is_null($value) ? '' : (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';');
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return "\xEF\xBB\xBF" . $csvContent;
    }

    private function generateReturnsPdfHtml($filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Devoluciones - Stokity V2</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                .section { margin: 30px 0; }
                .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #34495e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REPORTE DE DEVOLUCIONES - STOKITY V2</h1>
                <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
                <p>Usuario: ' . auth()->user()->name . '</p>
            </div>';

        // Resumen de devoluciones
        $html .= '
            <div class="section">
                <h3>RESUMEN DE DEVOLUCIONES</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Métrica</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total de Devoluciones</td>
                            <td>' . $returnsData->total_returns . '</td>
                        </tr>
                        <tr>
                            <td>Ventas Únicas con Devolución</td>
                            <td>' . $returnsData->unique_sales_returned . '</td>
                        </tr>
                        <tr>
                            <td>Monto Total de Devoluciones</td>
                            <td>$ ' . number_format($returnsData->total_amount, 2, ',', '.') . '</td>
                        </tr>
                        <tr>
                            <td>Promedio por Devolución</td>
                            <td>$ ' . number_format($returnsData->average_return, 2, ',', '.') . '</td>
                        </tr>
                    </tbody>
                </table>
            </div>';

        // Devoluciones por producto
        if (count($returnsByProduct) > 0) {
            $html .= '
            <div class="section">
                <h3>DEVOLUCIONES POR PRODUCTO</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad Devuelta</th>
                            <th>Devoluciones</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>';

            foreach ($returnsByProduct as $product) {
                $html .= '
                        <tr>
                            <td>' . $product->name . '</td>
                            <td>' . $product->returned_quantity . '</td>
                            <td>' . $product->return_count . '</td>
                            <td>$ ' . number_format($product->total_amount, 2, ',', '.') . '</td>
                        </tr>';
            }

            $html .= '
                    </tbody>
                </table>
            </div>';
        }

        $html .= '
            <div class="footer">
                <p>FIN DEL REPORTE</p>
                <p>Este reporte fue generado automáticamente por Stokity V2</p>
            </div>
        </body>
        </html>';

        return $html;
    }

    private function generateReturnsCsvContent($filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend)
    {
        $csv = [];

        $csv[] = ['REPORTE DE DEVOLUCIONES - STOKITY V2'];
        $csv[] = ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')];
        $csv[] = ['Usuario: ' . auth()->user()->name];
        $csv[] = [];

        // Resumen de devoluciones
        $csv[] = ['RESUMEN DE DEVOLUCIONES'];
        $csv[] = ['Métrica', 'Valor'];
        $csv[] = ['Total de Devoluciones', $returnsData->total_returns];
        $csv[] = ['Ventas Únicas con Devolución', $returnsData->unique_sales_returned];
        $csv[] = ['Monto Total de Devoluciones', '$ ' . number_format($returnsData->total_amount, 2, ',', '.')];
        $csv[] = ['Promedio por Devolución', '$ ' . number_format($returnsData->average_return, 2, ',', '.')];
        $csv[] = [];

        // Devoluciones por producto
        if (count($returnsByProduct) > 0) {
            $csv[] = ['DEVOLUCIONES POR PRODUCTO'];
            $csv[] = ['Producto', 'Cantidad Devuelta', 'Devoluciones', 'Monto'];

            foreach ($returnsByProduct as $product) {
                $csv[] = [
                    $product->name,
                    $product->returned_quantity,
                    $product->return_count,
                    '$ ' . number_format($product->total_amount, 2, ',', '.')
                ];
            }
            $csv[] = [];
        }

        $csv[] = ['FIN DEL REPORTE'];

        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            $cleanRow = array_map(function ($value) {
                return is_null($value) ? '' : (string)$value;
            }, $row);
            fputcsv($output, $cleanRow, ';');
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return "\xEF\xBB\xBF" . $csvContent;
    }
}
