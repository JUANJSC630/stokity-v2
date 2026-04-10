<?php

namespace App\Services;

use App\Models\Product;
use App\Models\SaleReturn;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportQueryService
{
    private const CACHE_TTL = 900; // 15 minutes

    /**
     * Build the standard filters array from a request.
     *
     * @return array{date_from: ?string, date_to: ?string, branch_id: mixed, seller_id: mixed, category_id: mixed, status: string}
     */
    public function getFilters(Request $request): array
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

        // Non-admin users are locked to their own branch
        if (! $user->isAdmin() && $user->branch_id) {
            $filters['branch_id'] = $user->branch_id;
        }

        // Default to current month when no dates specified
        if (! $filters['date_from'] && ! $filters['date_to']) {
            $now = now();
            $filters['date_from'] = $now->copy()->startOfMonth()->format('Y-m-d');
            $filters['date_to'] = $now->copy()->endOfMonth()->format('Y-m-d');
        }

        return $filters;
    }

    /**
     * Sales summary with current/previous period comparison.
     */
    public function getSalesSummary(array $filters): array
    {
        $cacheKey = 'sales_summary_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

            $summary = $query->select([
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('SUM(total) as total_amount'),
                DB::raw('SUM(net) as net_amount'),
                DB::raw('SUM(tax) as tax_amount'),
                DB::raw('AVG(total) as average_sale'),
                DB::raw('SUM(amount_paid) as total_paid'),
            ])->first();

            $previousPeriod = $this->getPreviousPeriod($filters);
            $previousQuery = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($previousQuery, $previousPeriod);

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
     * Top-selling products.
     *
     * @return \Illuminate\Support\Collection<int, \stdClass>
     */
    public function getTopProducts(array $filters, int $limit = 10): \Illuminate\Support\Collection
    {
        $cacheKey = 'top_products_'.md5(serialize($filters)).'_'.$limit;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters, $limit) {
            $results = DB::table('sales')
                ->join('sale_products', 'sales.id', '=', 'sale_products.sale_id')
                ->join('products', 'sale_products.product_id', '=', 'products.id')
                ->where('sales.status', 'completed')
                ->when($filters['date_from'], fn ($q, $d) => $q->whereDate('sales.date', '>=', $d))
                ->when($filters['date_to'], fn ($q, $d) => $q->whereDate('sales.date', '<=', $d))
                ->when($filters['branch_id'], fn ($q, $b) => $q->where('sales.branch_id', $b))
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
     * Sales grouped by branch.
     */
    public function getSalesByBranch(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'sales_by_branch_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Sales grouped by seller.
     */
    public function getSalesBySeller(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'sales_by_seller_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Returns summary (totals).
     */
    public function getReturnsSummary(array $filters): object
    {
        $cacheKey = 'returns_summary_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
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

            // Amounts query
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

            $amounts = $amountsQuery
                ->join('sale_return_products', 'sale_returns.id', '=', 'sale_return_products.sale_return_id')
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
     * Sales grouped by time period (day/week/month/year).
     */
    public function getSalesByPeriod(array $filters, string $groupBy = 'day'): \Illuminate\Support\Collection
    {
        $cacheKey = 'sales_by_period_'.md5(serialize($filters)).'_'.$groupBy;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters, $groupBy): \Illuminate\Support\Collection {
            $query = DB::table('sales')
                ->whereNull('sales.deleted_at');

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
                $query->whereExists(function ($sub) use ($filters) {
                    $sub->select(DB::raw(1))
                        ->from('sale_products')
                        ->join('products', 'sale_products.product_id', '=', 'products.id')
                        ->whereColumn('sale_products.sale_id', 'sales.id')
                        ->where('products.category_id', $filters['category_id']);
                });
            }

            $query->whereIn('sales.status', ['completed', 'cancelled']);

            $dateFormat = $this->getDateFormat($groupBy);

            return $query->select([
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
                            'total_sales' => 0, 'total_amount' => 0,
                            'net_amount' => 0, 'tax_amount' => 0, 'average_sale' => 0,
                        ],
                        'cancelled' => [
                            'total_sales' => 0, 'total_amount' => 0,
                            'net_amount' => 0, 'tax_amount' => 0, 'average_sale' => 0,
                        ],
                        'pending' => [
                            'total_sales' => 0, 'total_amount' => 0,
                            'net_amount' => 0, 'tax_amount' => 0, 'average_sale' => 0,
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
        });
    }

    /**
     * Products grouped by category with sales aggregates.
     */
    public function getProductsByCategory(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'products_by_category_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $results = DB::table('sales')
                ->join('sale_products', 'sales.id', '=', 'sale_products.sale_id')
                ->join('products', 'sale_products.product_id', '=', 'products.id')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->where('sales.status', 'completed')
                ->when($filters['date_from'], fn ($q, $d) => $q->whereDate('sales.date', '>=', $d))
                ->when($filters['date_to'], fn ($q, $d) => $q->whereDate('sales.date', '<=', $d))
                ->when($filters['branch_id'], fn ($q, $b) => $q->where('sales.branch_id', $b))
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

            return $results->map(fn ($item) => [
                'id' => (int) $item->id,
                'name' => $item->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_amount' => (float) $item->total_amount,
                'unique_products' => (int) $item->unique_products,
            ]);
        });
    }

    /**
     * Products with stock at or below min_stock.
     */
    public function getLowStockProducts(array $filters = []): \Illuminate\Support\Collection
    {
        $cacheKey = 'low_stock_products_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = Product::where('stock', '<=', DB::raw('min_stock'))
                ->where('status', true)
                ->where('type', '!=', 'servicio');

            if (! empty($filters['branch_id'])) {
                $query->whereHas('stockMovements', function ($q) use ($filters) {
                    $q->where('branch_id', (int) $filters['branch_id']);
                });
            }

            return $query->select(['id', 'name', 'code', 'stock', 'min_stock'])
                ->orderBy('stock')
                ->limit(20)
                ->get();
        });
    }

    /**
     * Products performance (sales vs stock).
     */
    public function getProductsPerformance(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'products_performance_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $results = DB::table('products')
                ->leftJoin('sale_products', 'products.id', '=', 'sale_products.product_id')
                ->leftJoin('sales', 'sale_products.sale_id', '=', 'sales.id')
                ->where('products.status', true)
                ->when($filters['date_from'], fn ($q, $d) => $q->whereDate('sales.date', '>=', $d))
                ->when($filters['date_to'], fn ($q, $d) => $q->whereDate('sales.date', '<=', $d))
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

            return $results->map(fn ($item) => [
                'id' => (int) $item->id,
                'name' => $item->name,
                'code' => $item->code,
                'stock' => (int) $item->stock,
                'sale_price' => (float) $item->sale_price,
                'sold_quantity' => (int) $item->sold_quantity,
                'sold_amount' => (float) $item->sold_amount,
                'total_quantity' => (int) $item->total_quantity,
            ]);
        });
    }

    /**
     * Sellers performance aggregates.
     */
    public function getSellersPerformance(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'sellers_performance_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters): \Illuminate\Support\Collection {
            $query = DB::table('sales')
                ->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

            return $query->join('users', 'sales.seller_id', '=', 'users.id')
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
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'email' => $item->email,
                    'total_sales' => (int) $item->total_sales,
                    'total_amount' => (float) $item->total_amount,
                    'average_sale' => (float) $item->average_sale,
                    'first_sale' => $item->first_sale,
                    'last_sale' => $item->last_sale,
                ]);
        });
    }

    /**
     * Sellers comparison: current vs previous period.
     */
    public function getSellersComparison(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'sellers_comparison_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $currentPeriod = $this->getSellersPerformance($filters);
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
     * Sellers grouped by branch.
     */
    public function getSellersByBranch(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'sellers_by_branch_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Branches performance aggregates.
     */
    public function getBranchesPerformance(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'branches_performance_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Branches comparison (sales count, totals, active days).
     */
    public function getBranchesComparison(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'branches_comparison_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Branches by region (placeholder).
     */
    public function getBranchesByRegion(array $filters): \Illuminate\Support\Collection
    {
        return collect();
    }

    /**
     * Returns grouped by product.
     */
    public function getReturnsByProduct(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'returns_by_product_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
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
     * Returns grouped by reason.
     */
    public function getReturnsByReason(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'returns_by_reason_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
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
     * Returns trend over time (daily).
     */
    public function getReturnsTrend(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'returns_trend_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
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
     * Payment methods summary.
     */
    public function getPaymentMethodsSummary(array $filters): \Illuminate\Support\Collection
    {
        $cacheKey = 'payment_methods_summary_'.md5(serialize($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            $query = DB::table('sales')->whereNull('sales.deleted_at');
            $this->applyDbFilters($query, $filters);

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
     * Calculate growth percentage between two values.
     */
    public function calculateGrowth(float|int $current, float|int $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 2);
    }

    /**
     * Get the previous period filters for comparison.
     */
    public function getPreviousPeriod(array $filters): array
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
     * Apply standard sales filters to a DB query builder.
     */
    public function applyDbFilters(\Illuminate\Database\Query\Builder $query, array $filters): void
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
            $query->whereExists(function ($sub) use ($filters) {
                $sub->select(DB::raw(1))
                    ->from('sale_products')
                    ->join('products', 'sale_products.product_id', '=', 'products.id')
                    ->whereColumn('sale_products.sale_id', 'sales.id')
                    ->where('products.category_id', $filters['category_id']);
            });
        }
        if ($filters['status'] && $filters['status'] !== 'all') {
            $query->where('sales.status', $filters['status']);
        } elseif (! $filters['status']) {
            $query->where('sales.status', 'completed');
        }
    }

    /**
     * Get the MySQL DATE_FORMAT string for a groupBy interval.
     */
    public function getDateFormat(string $groupBy): string
    {
        return match ($groupBy) {
            'week' => '%Y-%u',
            'month' => '%Y-%m',
            'year' => '%Y',
            default => '%Y-%m-%d',
        };
    }
}
