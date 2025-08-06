<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use App\Models\Branch;
use App\Models\User;
use App\Models\Category;
use App\Models\SaleReturn;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Display the dashboard with key metrics and statistics
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $currentDate = Carbon::now();
        $startOfMonth = $currentDate->copy()->startOfMonth();
        $endOfMonth = $currentDate->copy()->endOfMonth();
        $startOfPreviousMonth = $currentDate->copy()->subMonth()->startOfMonth();
        $endOfPreviousMonth = $currentDate->copy()->subMonth()->endOfMonth();

        // Filtros por sucursal si el usuario no es administrador
        $branchFilter = null;
        if (!$user->isAdmin()) {
            $branchFilter = $user->branch_id;
        }

        // Métricas principales
        $startOfDay = $currentDate->copy()->startOfDay();
        $endOfDay = $currentDate->copy()->endOfDay();
        

        
        $metrics = [
            'total_sales_today' => $this->getTotalSales($startOfDay, $endOfDay, $branchFilter),
            'total_sales_month' => $this->getTotalSales($startOfMonth, $endOfMonth, $branchFilter),
            'total_revenue_today' => $this->getTotalRevenue($startOfDay, $endOfDay, $branchFilter),
            'total_revenue_month' => $this->getTotalRevenue($startOfMonth, $endOfMonth, $branchFilter),
            'average_sale_today' => $this->getAverageSale($startOfDay, $endOfDay, $branchFilter),
            'average_sale_month' => $this->getAverageSale($startOfMonth, $endOfMonth, $branchFilter),
            'total_products' => $this->getTotalProducts($branchFilter),
            'low_stock_products' => $this->getLowStockProducts($branchFilter),
            'total_clients' => $this->getTotalClients($branchFilter),
            'total_users' => $this->getTotalUsers($branchFilter),
        ];



        // Comparación con mes anterior
        $previousMonthMetrics = [
            'total_sales' => $this->getTotalSales($startOfPreviousMonth, $endOfPreviousMonth, $branchFilter),
            'total_revenue' => $this->getTotalRevenue($startOfPreviousMonth, $endOfPreviousMonth, $branchFilter),
        ];

        // Comparación con día anterior
        $previousDay = $currentDate->copy()->subDay();
        $startOfPreviousDay = $previousDay->copy()->startOfDay();
        $endOfPreviousDay = $previousDay->copy()->endOfDay();
        
        $previousDayMetrics = [
            'total_sales' => $this->getTotalSales($startOfPreviousDay, $endOfPreviousDay, $branchFilter),
            'total_revenue' => $this->getTotalRevenue($startOfPreviousDay, $endOfPreviousDay, $branchFilter),
        ];

        // Cálculo de crecimiento (día actual vs día anterior)
        $growth = [
            'sales_growth' => $this->calculateGrowth($metrics['total_sales_today'], $previousDayMetrics['total_sales']),
            'revenue_growth' => $this->calculateGrowth($metrics['total_revenue_today'], $previousDayMetrics['total_revenue']),
        ];

        // Productos más vendidos del mes
        $topProducts = $this->getTopProducts($startOfMonth, $endOfMonth, $branchFilter, 5);

        // Ventas por sucursal (solo para administradores)
        $salesByBranch = [];
        if ($user->isAdmin()) {
            $salesByBranch = $this->getSalesByBranch($startOfMonth, $endOfMonth);
        }

        // Últimas ventas
        $recentSales = $this->getRecentSales($branchFilter, 5);

        // Productos con bajo stock
        $lowStockProducts = $this->getLowStockProductsList($branchFilter, 5);

        // Ventas por día (últimos 7 días)
        $dailySales = $this->getDailySales(7, $branchFilter);



        return Inertia::render('dashboard', [
            'metrics' => $metrics,
            'growth' => $growth,
            'topProducts' => $topProducts,
            'salesByBranch' => $salesByBranch,
            'recentSales' => $recentSales,
            'lowStockProducts' => $lowStockProducts,
            'dailySales' => $dailySales,
            'userRole' => $user->role,
            'userName' => $user->name,
        ]);
    }

    /**
     * Get total number of sales for a period
     */
    private function getTotalSales($startDate, $endDate, $branchId = null)
    {
        $query = Sale::whereBetween('date', [$startDate, $endDate])
            ->where('status', 'completed');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        $count = $query->count();
        
        return $count;
    }

    /**
     * Get total revenue for a period
     */
    private function getTotalRevenue($startDate, $endDate, $branchId = null)
    {
        $query = Sale::whereBetween('date', [$startDate, $endDate])
            ->where('status', 'completed');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        $sum = $query->sum('total');
        
        return $sum;
    }

    /**
     * Get average sale amount for a period
     */
    private function getAverageSale($startDate, $endDate, $branchId = null)
    {
        $query = Sale::whereBetween('date', [$startDate, $endDate])
            ->where('status', 'completed');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        $totalSales = $query->count();
        $totalRevenue = $query->sum('total');
        
        return $totalSales > 0 ? $totalRevenue / $totalSales : 0;
    }

    /**
     * Get total products count
     */
    private function getTotalProducts($branchId = null)
    {
        $query = Product::where('status', true);
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        return $query->count();
    }

    /**
     * Get low stock products count
     */
    private function getLowStockProducts($branchId = null)
    {
        $query = Product::where('status', true)
            ->whereRaw('stock <= min_stock');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        return $query->count();
    }

    /**
     * Get total clients count
     */
    private function getTotalClients($branchId = null)
    {
        $query = Client::query();
        
        // Los clientes no están asociados a sucursales específicas
        // y no tienen campo status, así que contamos todos
        
        return $query->count();
    }

    /**
     * Get total users count
     */
    private function getTotalUsers($branchId = null)
    {
        $query = User::where('status', true);
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        return $query->count();
    }

    /**
     * Calculate growth percentage
     */
    private function calculateGrowth($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        
        return round((($current - $previous) / $previous) * 100, 2);
    }

    /**
     * Get top selling products
     */
    private function getTopProducts($startDate, $endDate, $branchId = null, $limit = 5)
    {
        $query = DB::table('sale_products')
            ->join('sales', 'sale_products.sale_id', '=', 'sales.id')
            ->join('products', 'sale_products.product_id', '=', 'products.id')
            ->whereBetween('sales.date', [$startDate, $endDate])
            ->where('sales.status', 'completed')
            ->select(
                'products.id',
                'products.name',
                'products.code',
                'products.image',
                DB::raw('SUM(sale_products.quantity) as total_quantity'),
                DB::raw('SUM(sale_products.subtotal) as total_amount'),
                DB::raw('COUNT(DISTINCT sales.id) as sales_count')
            )
            ->groupBy('products.id', 'products.name', 'products.code', 'products.image')
            ->orderBy('total_quantity', 'desc')
            ->limit($limit);

        if ($branchId) {
            $query->where('sales.branch_id', $branchId);
        }

        return $query->get();
    }

    /**
     * Get sales by branch
     */
    private function getSalesByBranch($startDate, $endDate)
    {
        return DB::table('sales')
            ->join('branches', 'sales.branch_id', '=', 'branches.id')
            ->whereBetween('sales.date', [$startDate, $endDate])
            ->where('sales.status', 'completed')
            ->select(
                'branches.id',
                'branches.name',
                'branches.business_name',
                DB::raw('COUNT(sales.id) as total_sales'),
                DB::raw('SUM(sales.total) as total_amount'),
                DB::raw('AVG(sales.total) as average_sale')
            )
            ->groupBy('branches.id', 'branches.name', 'branches.business_name')
            ->orderBy('total_amount', 'desc')
            ->get();
    }

    /**
     * Get recent sales
     */
        private function getRecentSales($branchId = null, $limit = 5)
    {
        $query = Sale::with(['branch', 'client', 'seller'])
            ->where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->limit($limit);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->get();
    }

    /**
     * Get low stock products list
     */
        private function getLowStockProductsList($branchId = null, $limit = 5)
    {
        $query = Product::with(['category', 'branch'])
            ->where('status', true)
            ->whereRaw('stock <= min_stock')
            ->orderBy('stock', 'asc')
            ->limit($limit);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->get();
    }

    /**
     * Get daily sales for chart
     */
    private function getDailySales($days, $branchId = null)
    {
        $startDate = Carbon::now()->subDays($days - 1)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        // Obtener las ventas por día
        $salesQuery = DB::table('sales')
            ->whereBetween('date', [$startDate, $endDate])
            ->where('status', 'completed')
            ->select(
                DB::raw('DATE(date) as date'),
                DB::raw('COUNT(*) as total_sales'),
                DB::raw('SUM(total) as total_amount')
            )
            ->groupBy(DB::raw('DATE(date)'))
            ->orderBy('date', 'asc');

        if ($branchId) {
            $salesQuery->where('branch_id', $branchId);
        }

        $salesData = $salesQuery->get()->keyBy('date');

        // Generar todos los días del período
        $allDays = collect();
        $currentDate = $startDate->copy();
        
        while ($currentDate <= $endDate) {
            $dateKey = $currentDate->format('Y-m-d');
            $dayData = $salesData->get($dateKey);
            
            $allDays->push([
                'date' => $dateKey,
                'total_sales' => $dayData ? (int) $dayData->total_sales : 0,
                'total_amount' => $dayData ? (float) $dayData->total_amount : 0,
            ]);
            
            $currentDate->addDay();
        }

        return $allDays;
    }
} 