<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Rutas principales de reportes
    Route::prefix('reports')->name('reports.')->group(function () {
        // Dashboard principal de reportes
        Route::get('/', [ReportController::class, 'index'])->name('index');
        
        // Reporte detallado de ventas
        Route::get('/sales-detail', [ReportController::class, 'salesDetail'])->name('sales-detail');
        Route::get('/sales-detail/export/pdf', [ReportController::class, 'exportSalesDetailPdf'])->name('sales-detail.export.pdf');
        Route::get('/sales-detail/export/excel', [ReportController::class, 'exportSalesDetailExcel'])->name('sales-detail.export.excel');
        
        // Reporte de productos
        Route::get('/products', [ReportController::class, 'productsReport'])->name('products');
        Route::get('/products/export/pdf', [ReportController::class, 'exportProductsPdf'])->name('products.export.pdf');
        Route::get('/products/export/excel', [ReportController::class, 'exportProductsExcel'])->name('products.export.excel');
        
        // Reporte de vendedores
        Route::get('/sellers', [ReportController::class, 'sellersReport'])->name('sellers');
        Route::get('/sellers/export/pdf', [ReportController::class, 'exportSellersPdf'])->name('sellers.export.pdf');
        Route::get('/sellers/export/excel', [ReportController::class, 'exportSellersExcel'])->name('sellers.export.excel');
        
        // Reporte de sucursales
        Route::get('/branches', [ReportController::class, 'branchesReport'])->name('branches');
        Route::get('/branches/export/pdf', [ReportController::class, 'exportBranchesPdf'])->name('branches.export.pdf');
        Route::get('/branches/export/excel', [ReportController::class, 'exportBranchesExcel'])->name('branches.export.excel');
        
        // Reporte de devoluciones
        Route::get('/returns', [ReportController::class, 'returnsReport'])->name('returns');
        Route::get('/returns/export/pdf', [ReportController::class, 'exportReturnsPdf'])->name('returns.export.pdf');
        Route::get('/returns/export/excel', [ReportController::class, 'exportReturnsExcel'])->name('returns.export.excel');
        
        // Exportación general de reportes (mantener compatibilidad)
        Route::get('/export/pdf', [ReportController::class, 'exportPdf'])->name('export.pdf');
        Route::get('/export/excel', [ReportController::class, 'exportExcel'])->name('export.excel');
    });
}); 