<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExportService
{
    /**
     * Create a StreamedResponse that writes CSV rows to php://output.
     *
     * @param callable(resource): void $writer  Callback that receives the output handle and writes rows
     */
    public function streamCsv(string $filename, callable $writer): StreamedResponse
    {
        return new StreamedResponse(function () use ($writer) {
            $output = fopen('php://output', 'w');
            // UTF-8 BOM for Excel compatibility
            fwrite($output, "\xEF\xBB\xBF");
            $writer($output);
            fclose($output);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'no-cache, must-revalidate',
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ]);
    }

    /**
     * Write a single CSV row to a file handle.
     *
     * @param resource $handle
     */
    private function writeRow($handle, array $row): void
    {
        $cleanRow = array_map(fn ($v) => is_null($v) ? '' : (string) $v, $row);
        fputcsv($handle, $cleanRow, ';');
    }

    // ────────────────────────────────────────────────────────────────────
    //  General report (index) — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generatePdfHtml(array $filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods): string
    {
        $totalSales  = collect($salesData)->sum('total_sales');
        $totalAmount = collect($salesData)->sum('total_amount');
        $avgSale     = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        $html = $this->pdfHeader('REPORTE DE VENTAS - STOKITY V2');

        // Executive summary
        $html .= $this->executiveSummary($totalSales, $totalAmount, $avgSale);

        // Applied filters
        $html .= $this->filtersSection($filters);

        // Sales by period
        if (count($salesData) > 0) {
            $html .= $this->salesByPeriodTable($salesData);
        }

        // Top products
        if (count($topProducts) > 0) {
            $html .= '<div class="section"><h3>PRODUCTOS MÁS VENDIDOS</h3>
                <table><thead><tr><th>Código</th><th>Nombre del Producto</th><th class="number">Cantidad Vendida</th><th class="currency">Monto Total</th><th class="number">Número de Ventas</th></tr></thead><tbody>';
            foreach ($topProducts as $product) {
                $html .= '<tr><td>' . e($product->code) . '</td><td>' . e($product->name) . '</td><td class="number">' . $product->total_quantity . '</td><td class="currency">$ ' . number_format($product->total_amount, 2, ',', '.') . '</td><td class="number">' . $product->sales_count . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        // Sales by branch
        if (count($salesByBranch) > 0) {
            $html .= '<div class="section"><h3>VENTAS POR SUCURSAL</h3>
                <table><thead><tr><th>ID</th><th>Nombre de Sucursal</th><th>Nombre Comercial</th><th class="number">Total Ventas</th><th class="currency">Monto Total</th><th class="currency">Promedio por Venta</th></tr></thead><tbody>';
            foreach ($salesByBranch as $branch) {
                $html .= '<tr><td>' . $branch->id . '</td><td>' . e($branch->name) . '</td><td>' . e($branch->business_name ?? 'N/A') . '</td><td class="number">' . $branch->total_sales . '</td><td class="currency">$ ' . number_format($branch->total_amount, 2, ',', '.') . '</td><td class="currency">$ ' . number_format($branch->average_sale, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        // Sales by seller
        if (count($salesBySeller) > 0) {
            $html .= '<div class="section"><h3>VENTAS POR VENDEDOR</h3>
                <table><thead><tr><th>ID</th><th>Nombre del Vendedor</th><th>Email</th><th class="number">Total Ventas</th><th class="currency">Monto Total</th><th class="currency">Promedio por Venta</th></tr></thead><tbody>';
            foreach ($salesBySeller as $seller) {
                $html .= '<tr><td>' . $seller->id . '</td><td>' . e($seller->name) . '</td><td>' . e($seller->email) . '</td><td class="number">' . $seller->total_sales . '</td><td class="currency">$ ' . number_format($seller->total_amount, 2, ',', '.') . '</td><td class="currency">$ ' . number_format($seller->average_sale, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        // Returns by product
        if (count($returnsData) > 0) {
            $html .= '<div class="section"><h3>DEVOLUCIONES POR PRODUCTO</h3>
                <table><thead><tr><th>ID</th><th>Código</th><th>Nombre del Producto</th><th class="number">Cantidad Devuelta</th><th class="number">Número de Devoluciones</th></tr></thead><tbody>';
            foreach ($returnsData as $return) {
                $html .= '<tr><td>' . $return->id . '</td><td>' . e($return->code) . '</td><td>' . e($return->name) . '</td><td class="number">' . $return->returned_quantity . '</td><td class="number">' . $return->return_count . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        // Payment methods
        if (count($paymentMethods) > 0) {
            $html .= '<div class="section"><h3>MÉTODOS DE PAGO</h3>
                <table><thead><tr><th>Método de Pago</th><th class="number">Número de Transacciones</th><th class="currency">Monto Total</th><th class="currency">Promedio por Transacción</th></tr></thead><tbody>';
            foreach ($paymentMethods as $method) {
                $html .= '<tr><td>' . ucfirst(str_replace('_', ' ', $method->payment_method)) . '</td><td class="number">' . $method->transaction_count . '</td><td class="currency">$ ' . number_format($method->total_amount, 2, ',', '.') . '</td><td class="currency">$ ' . number_format($method->average_amount, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamGeneralCsv(string $filename, array $filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($filters, $salesData, $topProducts, $salesByBranch, $salesBySeller, $returnsData, $paymentMethods) {
            $totalSales  = collect($salesData)->sum('total_sales');
            $totalAmount = collect($salesData)->sum('total_amount');
            $avgSale     = $totalSales > 0 ? $totalAmount / $totalSales : 0;

            $this->writeRow($h, ['Reporte', 'Ventas General']);
            $this->writeRow($h, ['Generado', now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario', auth()->user()->name]);
            $this->writeRow($h, ['Fecha desde', $filters['date_from'] ?? 'Todas']);
            $this->writeRow($h, ['Fecha hasta', $filters['date_to'] ?? 'Todas']);
            $this->writeRow($h, ['Total ventas', $totalSales, 'Monto total', round($totalAmount, 2), 'Promedio', round($avgSale, 2)]);
            $this->writeRow($h, []);

            if (count($salesData) > 0) {
                $this->writeRow($h, [
                    'Fecha',
                    'Ventas Completadas', 'Monto Completadas', 'Neto Completadas', 'Impuesto Completadas', 'Promedio Completadas',
                    'Ventas Canceladas', 'Monto Canceladas', 'Neto Canceladas', 'Impuesto Canceladas', 'Promedio Canceladas',
                    'Ventas Pendientes', 'Monto Pendientes', 'Neto Pendientes', 'Impuesto Pendientes', 'Promedio Pendientes',
                ]);
                foreach ($salesData as $sale) {
                    $this->writeRow($h, [
                        $sale['period'],
                        $sale['completed']['total_sales'], round($sale['completed']['total_amount'], 2), round($sale['completed']['net_amount'], 2), round($sale['completed']['tax_amount'], 2), round($sale['completed']['average_sale'], 2),
                        $sale['cancelled']['total_sales'], round($sale['cancelled']['total_amount'], 2), round($sale['cancelled']['net_amount'], 2), round($sale['cancelled']['tax_amount'], 2), round($sale['cancelled']['average_sale'], 2),
                        $sale['pending']['total_sales'], round($sale['pending']['total_amount'], 2), round($sale['pending']['net_amount'], 2), round($sale['pending']['tax_amount'], 2), round($sale['pending']['average_sale'], 2),
                    ]);
                }
                $this->writeRow($h, []);
            }

            if (count($topProducts) > 0) {
                $this->writeRow($h, []);
                $this->writeRow($h, ['--- PRODUCTOS MÁS VENDIDOS ---']);
                $this->writeRow($h, ['Código', 'Producto', 'Cantidad Vendida', 'Monto Total', 'Num. Ventas']);
                foreach ($topProducts as $product) {
                    $this->writeRow($h, [$product->code, $product->name, $product->total_quantity, round($product->total_amount, 2), $product->sales_count]);
                }
            }

            if (count($salesByBranch) > 0) {
                $this->writeRow($h, []);
                $this->writeRow($h, ['--- VENTAS POR SUCURSAL ---']);
                $this->writeRow($h, ['Sucursal', 'Nombre Comercial', 'Num. Ventas', 'Monto Total', 'Promedio por Venta']);
                foreach ($salesByBranch as $branch) {
                    $this->writeRow($h, [$branch->name, $branch->business_name ?? '', $branch->total_sales, round($branch->total_amount, 2), round($branch->average_sale, 2)]);
                }
            }

            if (count($salesBySeller) > 0) {
                $this->writeRow($h, []);
                $this->writeRow($h, ['--- VENTAS POR VENDEDOR ---']);
                $this->writeRow($h, ['Vendedor', 'Email', 'Num. Ventas', 'Monto Total', 'Promedio por Venta']);
                foreach ($salesBySeller as $seller) {
                    $this->writeRow($h, [$seller->name, $seller->email, $seller->total_sales, round($seller->total_amount, 2), round($seller->average_sale, 2)]);
                }
            }

            if (count($returnsData) > 0) {
                $this->writeRow($h, []);
                $this->writeRow($h, ['--- DEVOLUCIONES POR PRODUCTO ---']);
                $this->writeRow($h, ['Código', 'Producto', 'Cantidad Devuelta', 'Num. Devoluciones']);
                foreach ($returnsData as $return) {
                    $this->writeRow($h, [$return->code, $return->name, $return->returned_quantity, $return->return_count]);
                }
            }

            if (count($paymentMethods) > 0) {
                $this->writeRow($h, []);
                $this->writeRow($h, ['--- MÉTODOS DE PAGO ---']);
                $this->writeRow($h, ['Método de Pago', 'Num. Transacciones', 'Monto Total', 'Promedio por Transacción']);
                foreach ($paymentMethods as $method) {
                    $this->writeRow($h, [ucfirst(str_replace('_', ' ', $method->payment_method)), $method->transaction_count, round($method->total_amount, 2), round($method->average_amount, 2)]);
                }
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Sales detail — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generateSalesDetailPdfHtml(array $filters, $salesData, $totalSales, $totalAmount, $averageSale, string $groupBy): string
    {
        $html = $this->pdfHeader('REPORTE DETALLADO DE VENTAS - STOKITY V2');
        $html .= $this->executiveSummary($totalSales, $totalAmount, $averageSale);
        $html .= $this->filtersSection($filters);

        if (count($salesData) > 0) {
            $html .= $this->salesByPeriodTable($salesData);
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamSalesDetailCsv(string $filename, array $filters, $salesData, $totalSales, $totalAmount, $averageSale, string $groupBy): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($filters, $salesData, $totalSales, $totalAmount, $averageSale) {
            $this->writeRow($h, ['Reporte', 'Detalle de Ventas']);
            $this->writeRow($h, ['Generado', now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario', auth()->user()->name]);
            $this->writeRow($h, ['Fecha desde', $filters['date_from'] ?? 'Todas']);
            $this->writeRow($h, ['Fecha hasta', $filters['date_to'] ?? 'Todas']);
            $this->writeRow($h, ['Total ventas', $totalSales, 'Monto total', round($totalAmount, 2), 'Promedio', round($averageSale, 2)]);
            $this->writeRow($h, []);

            $this->writeRow($h, [
                'Fecha',
                'Ventas Completadas', 'Monto Completadas', 'Neto Completadas', 'Impuesto Completadas', 'Promedio Completadas',
                'Ventas Canceladas', 'Monto Canceladas', 'Neto Canceladas', 'Impuesto Canceladas', 'Promedio Canceladas',
                'Ventas Pendientes', 'Monto Pendientes', 'Neto Pendientes', 'Impuesto Pendientes', 'Promedio Pendientes',
            ]);

            foreach ($salesData as $sale) {
                $this->writeRow($h, [
                    $sale['period'],
                    $sale['completed']['total_sales'], round($sale['completed']['total_amount'], 2), round($sale['completed']['net_amount'], 2), round($sale['completed']['tax_amount'], 2), round($sale['completed']['average_sale'], 2),
                    $sale['cancelled']['total_sales'], round($sale['cancelled']['total_amount'], 2), round($sale['cancelled']['net_amount'], 2), round($sale['cancelled']['tax_amount'], 2), round($sale['cancelled']['average_sale'], 2),
                    $sale['pending']['total_sales'], round($sale['pending']['total_amount'], 2), round($sale['pending']['net_amount'], 2), round($sale['pending']['tax_amount'], 2), round($sale['pending']['average_sale'], 2),
                ]);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Products report — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generateProductsPdfHtml(array $filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts): string
    {
        $html = $this->pdfHeader('REPORTE DE PRODUCTOS - STOKITY V2');

        if (count($topProducts) > 0) {
            $html .= '<div class="section"><h3>TOP PRODUCTOS</h3>
                <table><thead><tr><th>Producto</th><th>Ventas</th><th>Monto</th></tr></thead><tbody>';
            foreach ($topProducts as $product) {
                $html .= '<tr><td>' . e($product->name) . '</td><td>' . $product->total_quantity . '</td><td>$ ' . number_format($product->total_amount, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamProductsCsv(string $filename, array $filters, $productsData, $topProducts, $productsByCategory, $lowStockProducts): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($topProducts) {
            $this->writeRow($h, ['REPORTE DE PRODUCTOS - STOKITY V2']);
            $this->writeRow($h, ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario: ' . auth()->user()->name]);
            $this->writeRow($h, []);

            if (count($topProducts) > 0) {
                $this->writeRow($h, ['TOP PRODUCTOS']);
                $this->writeRow($h, ['Producto', 'Ventas', 'Monto']);
                foreach ($topProducts as $product) {
                    $this->writeRow($h, [$product->name, $product->total_quantity, '$ ' . number_format($product->total_amount, 2, ',', '.')]);
                }
                $this->writeRow($h, []);
            }

            $this->writeRow($h, ['FIN DEL REPORTE']);
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Sellers report — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generateSellersPdfHtml(array $filters, $sellersData, $sellersComparison, $sellersByBranch): string
    {
        $html = $this->pdfHeader('REPORTE DE VENDEDORES - STOKITY V2');

        if (count($sellersData) > 0) {
            $html .= '<div class="section"><h3>RENDIMIENTO DE VENDEDORES</h3>
                <table><thead><tr><th>Vendedor</th><th>Ventas</th><th>Monto</th><th>Promedio</th></tr></thead><tbody>';
            foreach ($sellersData as $seller) {
                $html .= '<tr><td>' . e($seller['name']) . '</td><td>' . $seller['total_sales'] . '</td><td>$ ' . number_format($seller['total_amount'], 2, ',', '.') . '</td><td>$ ' . number_format($seller['average_sale'], 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamSellersCsv(string $filename, array $filters, $sellersData, $sellersComparison, $sellersByBranch): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($filters, $sellersData) {
            $this->writeRow($h, ['Reporte', 'Vendedores']);
            $this->writeRow($h, ['Generado', now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario', auth()->user()->name]);
            $this->writeRow($h, ['Fecha desde', $filters['date_from'] ?? 'Todas']);
            $this->writeRow($h, ['Fecha hasta', $filters['date_to'] ?? 'Todas']);
            $this->writeRow($h, []);

            $this->writeRow($h, ['Vendedor', 'Num. Ventas', 'Monto Total', 'Promedio por Venta']);
            foreach ($sellersData as $seller) {
                $this->writeRow($h, [$seller['name'], $seller['total_sales'], round($seller['total_amount'], 2), round($seller['average_sale'], 2)]);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Branches report — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generateBranchesPdfHtml(array $filters, $branchesData, $branchesComparison, $branchesByRegion): string
    {
        $html = $this->pdfHeader('REPORTE DE SUCURSALES - STOKITY V2');

        if (count($branchesData) > 0) {
            $html .= '<div class="section"><h3>RENDIMIENTO DE SUCURSALES</h3>
                <table><thead><tr><th>Sucursal</th><th>Ventas</th><th>Monto</th><th>Promedio</th></tr></thead><tbody>';
            foreach ($branchesData as $branch) {
                $html .= '<tr><td>' . e($branch->name) . '</td><td>' . $branch->total_sales . '</td><td>$ ' . number_format($branch->total_amount, 2, ',', '.') . '</td><td>$ ' . number_format($branch->average_sale, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamBranchesCsv(string $filename, array $filters, $branchesData, $branchesComparison, $branchesByRegion): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($filters, $branchesData) {
            $this->writeRow($h, ['Reporte', 'Sucursales']);
            $this->writeRow($h, ['Generado', now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario', auth()->user()->name]);
            $this->writeRow($h, ['Fecha desde', $filters['date_from'] ?? 'Todas']);
            $this->writeRow($h, ['Fecha hasta', $filters['date_to'] ?? 'Todas']);
            $this->writeRow($h, []);

            $this->writeRow($h, ['Sucursal', 'Nombre Comercial', 'Num. Ventas', 'Vendedores Activos', 'Monto Total', 'Promedio por Venta']);
            foreach ($branchesData as $branch) {
                $this->writeRow($h, [$branch->name, $branch->business_name ?? '', $branch->total_sales, $branch->active_sellers, round($branch->total_amount, 2), round($branch->average_sale, 2)]);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Returns report — PDF & CSV
    // ────────────────────────────────────────────────────────────────────

    public function generateReturnsPdfHtml(array $filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend): string
    {
        $html = $this->pdfHeader('REPORTE DE DEVOLUCIONES - STOKITY V2');

        // Summary
        $html .= '<div class="section"><h3>RESUMEN DE DEVOLUCIONES</h3>
            <table><thead><tr><th>Métrica</th><th>Valor</th></tr></thead><tbody>
            <tr><td>Total de Devoluciones</td><td>' . $returnsData->total_returns . '</td></tr>
            <tr><td>Ventas Únicas con Devolución</td><td>' . $returnsData->unique_sales_returned . '</td></tr>
            <tr><td>Monto Total de Devoluciones</td><td>$ ' . number_format($returnsData->total_amount, 2, ',', '.') . '</td></tr>
            <tr><td>Promedio por Devolución</td><td>$ ' . number_format($returnsData->average_return, 2, ',', '.') . '</td></tr>
            </tbody></table></div>';

        // By product
        if (count($returnsByProduct) > 0) {
            $html .= '<div class="section"><h3>DEVOLUCIONES POR PRODUCTO</h3>
                <table><thead><tr><th>Producto</th><th>Cantidad Devuelta</th><th>Devoluciones</th><th>Monto</th></tr></thead><tbody>';
            foreach ($returnsByProduct as $product) {
                $html .= '<tr><td>' . e($product->name) . '</td><td>' . $product->returned_quantity . '</td><td>' . $product->return_count . '</td><td>$ ' . number_format($product->total_amount, 2, ',', '.') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= $this->pdfFooter();

        return $html;
    }

    public function streamReturnsCsv(string $filename, array $filters, $returnsData, $returnsByProduct, $returnsByReason, $returnsTrend): StreamedResponse
    {
        return $this->streamCsv($filename, function ($h) use ($returnsData, $returnsByProduct) {
            $this->writeRow($h, ['REPORTE DE DEVOLUCIONES - STOKITY V2']);
            $this->writeRow($h, ['Fecha de generación: ' . now()->format('d/m/Y H:i:s')]);
            $this->writeRow($h, ['Usuario: ' . auth()->user()->name]);
            $this->writeRow($h, []);

            $this->writeRow($h, ['RESUMEN DE DEVOLUCIONES']);
            $this->writeRow($h, ['Métrica', 'Valor']);
            $this->writeRow($h, ['Total de Devoluciones', $returnsData->total_returns]);
            $this->writeRow($h, ['Ventas Únicas con Devolución', $returnsData->unique_sales_returned]);
            $this->writeRow($h, ['Monto Total de Devoluciones', '$ ' . number_format($returnsData->total_amount, 2, ',', '.')]);
            $this->writeRow($h, ['Promedio por Devolución', '$ ' . number_format($returnsData->average_return, 2, ',', '.')]);
            $this->writeRow($h, []);

            if (count($returnsByProduct) > 0) {
                $this->writeRow($h, ['DEVOLUCIONES POR PRODUCTO']);
                $this->writeRow($h, ['Producto', 'Cantidad Devuelta', 'Devoluciones', 'Monto']);
                foreach ($returnsByProduct as $product) {
                    $this->writeRow($h, [$product->name, $product->returned_quantity, $product->return_count, '$ ' . number_format($product->total_amount, 2, ',', '.')]);
                }
                $this->writeRow($h, []);
            }

            $this->writeRow($h, ['FIN DEL REPORTE']);
        });
    }

    // ────────────────────────────────────────────────────────────────────
    //  Shared HTML building blocks
    // ────────────────────────────────────────────────────────────────────

    private function pdfHeader(string $title): string
    {
        return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' . e($title) . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { color: #2c3e50; margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #7f8c8d; }
            .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .summary h2 { color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; }
            .summary-grid { display: table; width: 100%; }
            .summary-item { display: table-cell; text-align: center; }
            .summary-item strong { display: block; font-size: 20px; color: #27ae60; }
            .section { margin: 30px 0; }
            .section h3 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9px; }
            th { background: #34495e; color: white; padding: 5px 4px; text-align: left; font-size: 9px; }
            td { padding: 5px 4px; border-bottom: 1px solid #ddd; font-size: 9px; }
            tr:nth-child(even) { background: #f8f9fa; }
            .filters { background: #ecf0f1; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .filters h3 { margin: 0 0 10px 0; color: #2c3e50; }
            .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            .currency { text-align: right; }
            .number { text-align: center; }
        </style></head><body>
        <div class="header">
            <h1>' . e($title) . '</h1>
            <p>Sistema de Gestión de Inventario y Ventas</p>
            <p>Fecha de generación: ' . now()->format('d/m/Y H:i:s') . '</p>
            <p>Usuario: ' . e(auth()->user()->name) . '</p>
        </div>';
    }

    private function pdfFooter(): string
    {
        return '<div class="footer">
            <p>FIN DEL REPORTE</p>
            <p>Este reporte fue generado automáticamente por Stokity V2</p>
            <p>Para más información, contacte al administrador del sistema</p>
        </div></body></html>';
    }

    private function executiveSummary(int|float $totalSales, float $totalAmount, float $avgSale): string
    {
        return '<div class="summary"><h2>RESUMEN EJECUTIVO</h2>
            <div class="summary-grid">
                <div class="summary-item"><strong>' . number_format($totalSales) . '</strong><span>Total de Ventas</span></div>
                <div class="summary-item"><strong>$ ' . number_format($totalAmount, 2, ',', '.') . '</strong><span>Monto Total</span></div>
                <div class="summary-item"><strong>$ ' . number_format($avgSale, 2, ',', '.') . '</strong><span>Promedio por Venta</span></div>
            </div></div>';
    }

    private function filtersSection(array $filters): string
    {
        $html = '<div class="filters"><h3>FILTROS APLICADOS</h3>';
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
        if (!empty($filters['category_id'])) {
            $html .= '<p><strong>Categoría ID:</strong> ' . $filters['category_id'] . '</p>';
            $hasFilters = true;
        }
        if (!$hasFilters) {
            $html .= '<p>Sin filtros aplicados (todos los datos)</p>';
        }

        return $html . '</div>';
    }

    private function salesByPeriodTable($salesData): string
    {
        $html = '<div class="section"><h3>VENTAS POR PERÍODO</h3>
            <table><thead>
                <tr>
                    <th rowspan="2">Fecha</th>
                    <th colspan="5" style="text-align: center;">Completadas</th>
                    <th colspan="5" style="text-align: center;">Canceladas</th>
                    <th colspan="5" style="text-align: center;">Pendientes</th>
                </tr>
                <tr>
                    <th class="number">Ventas</th><th class="currency">Monto</th><th class="currency">Neto</th><th class="currency">Imp.</th><th class="currency">Prom.</th>
                    <th class="number">Ventas</th><th class="currency">Monto</th><th class="currency">Neto</th><th class="currency">Imp.</th><th class="currency">Prom.</th>
                    <th class="number">Ventas</th><th class="currency">Monto</th><th class="currency">Neto</th><th class="currency">Imp.</th><th class="currency">Prom.</th>
                </tr>
            </thead><tbody>';

        foreach ($salesData as $sale) {
            $html .= '<tr><td>' . $sale['period'] . '</td>';
            foreach (['completed', 'cancelled', 'pending'] as $status) {
                $s = $sale[$status];
                $html .= '<td class="number">' . $s['total_sales'] . '</td>'
                    . '<td class="currency">$ ' . number_format($s['total_amount'], 2, ',', '.') . '</td>'
                    . '<td class="currency">$ ' . number_format($s['net_amount'], 2, ',', '.') . '</td>'
                    . '<td class="currency">$ ' . number_format($s['tax_amount'], 2, ',', '.') . '</td>'
                    . '<td class="currency">$ ' . number_format($s['average_sale'], 2, ',', '.') . '</td>';
            }
            $html .= '</tr>';
        }

        return $html . '</tbody></table></div>';
    }
}
