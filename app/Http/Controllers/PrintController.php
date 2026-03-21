<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Sale;
use App\Models\SaleReturn;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Mike42\Escpos\EscposImage;
use Mike42\Escpos\PrintConnectors\DummyPrintConnector;
use Mike42\Escpos\Printer;

class PrintController extends Controller
{
    /**
     * Serve the QZ Tray public certificate.
     * This endpoint is public — QZ Tray needs it to verify the server signature.
     */
    public function certificate(): Response
    {
        $cert = base64_decode(config('services.qz_tray.certificate_b64', ''));

        return response($cert ?: '', 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * Serve the QZ Tray certificate as a downloadable .pem file.
     */
    public function certificateDownload(): Response
    {
        $cert = base64_decode(config('services.qz_tray.certificate_b64', ''));

        return response($cert ?: '', 200)
            ->header('Content-Type', 'application/x-pem-file')
            ->header('Content-Disposition', 'attachment; filename="stokity-qztray.pem"');
    }

    /**
     * Sign a QZ Tray request with the server private key (SHA-512).
     * Only authenticated users can call this.
     */
    public function sign(Request $request): Response
    {
        $data       = $request->query('request', '');
        $privateKey = base64_decode(config('services.qz_tray.private_key_b64', ''));

        if (! $privateKey || ! $data) {
            return response('', 400);
        }

        openssl_sign($data, $signature, $privateKey, OPENSSL_ALGO_SHA512);

        return response(base64_encode($signature))
            ->header('Content-Type', 'text/plain');
    }

    /**
     * Generate ESC/POS receipt bytes for a sale, base64-encoded.
     */
    public function receipt(Request $request, Sale $sale)
    {
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $sale->branch_id !== $user->branch_id, 403, 'No tienes acceso a este recibo.');

        $sale->load(['branch', 'client', 'seller', 'saleProducts.product']);

        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $paperWidth   = (int) $request->query('width', $config['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $connector = new DummyPrintConnector();
        $printer   = $this->createPrinter($connector);

        try {
            $this->printReceipt($printer, $sale, $business, $charsPerLine, $config);
        } finally {
            $bytes = $connector->getData();
            $printer->close();
        }

        return response()->json([
            'data' => base64_encode($bytes),
            'code' => $sale->code,
        ]);
    }

    /**
     * Generate ESC/POS arqueo report for a cash session, base64-encoded.
     */
    public function cashSessionReport(Request $request, CashSession $session)
    {
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $session->branch_id !== $user->branch_id, 403, 'No tienes acceso a este reporte de caja.');

        $session->load(['branch:id,name', 'openedBy:id,name', 'closedBy:id,name', 'movements']);

        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $cfg          = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);
        $paperWidth   = (int) $request->query('width', $cfg['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $sep  = str_repeat('-', $charsPerLine);
        $sep2 = str_repeat('=', $charsPerLine);

        $connector = new DummyPrintConnector();
        $printer   = $this->createPrinter($connector);

        try {
            $p = $printer;

            // ── Header (same style as sale receipts) ─────────────────────────
            $this->printBusinessHeader($p, $business, $charsPerLine, $cfg);

            $p->text($sep2 . "\n");
            $p->setJustification(Printer::JUSTIFY_CENTER);
            $p->setEmphasis(true);
            $p->text("ARQUEO DE CAJA\n");
            $p->setEmphasis(false);
            $p->text($sep . "\n");

            // ── Session info ─────────────────────────────────────────────────
            $p->setJustification(Printer::JUSTIFY_LEFT);

            $tz = 'America/Bogota';
            $openedAt = \Carbon\Carbon::parse($session->opened_at)->setTimezone($tz);
            $closedAt = $session->closed_at ? \Carbon\Carbon::parse($session->closed_at)->setTimezone($tz) : null;

            $p->setEmphasis(true); $p->text('Turno:   '); $p->setEmphasis(false);
            $p->text('#' . $session->id . "\n");

            if ($session->branch) {
                $p->setEmphasis(true); $p->text('Sucursal:'); $p->setEmphasis(false);
                $p->text(' ' . $this->truncate($session->branch->name, $charsPerLine - 10) . "\n");
            }
            if ($session->openedBy) {
                $p->setEmphasis(true); $p->text('Cajero:  '); $p->setEmphasis(false);
                $p->text($this->truncate($session->openedBy->name, $charsPerLine - 9) . "\n");
            }

            $p->setEmphasis(true); $p->text('Apertura:'); $p->setEmphasis(false);
            $p->text(' ' . $openedAt->format('d/m/Y H:i') . "\n");

            if ($closedAt) {
                $p->setEmphasis(true); $p->text('Cierre:  '); $p->setEmphasis(false);
                $p->text($closedAt->format('d/m/Y H:i') . "\n");
            }

            $p->text($sep . "\n");

            // ── Sales summary ────────────────────────────────────────────────
            $salesByMethod = Sale::where('session_id', $session->id)
                ->where('status', 'completed')
                ->selectRaw('payment_method, SUM(total) as total, COUNT(*) as count')
                ->groupBy('payment_method')
                ->get();

            // Map payment method codes → display names from DB
            $pmNames = \App\Models\PaymentMethod::pluck('name', 'code');

            if ($salesByMethod->isNotEmpty()) {
                $p->setEmphasis(true);
                $p->text("VENTAS\n");
                $p->setEmphasis(false);
                $totalSales = 0;
                foreach ($salesByMethod as $row) {
                    $code  = (string) data_get($row, 'payment_method', '');
                    $name  = $pmNames->get($code, ucfirst($code)); // fallback to ucfirst if not found
                    $total = (float) data_get($row, 'total', 0);
                    $totalSales += $total;
                    $this->printTotalRow($p, $name . ' (' . (int) data_get($row, 'count', 0) . '):', $this->formatMoney($total), $charsPerLine);
                }
                $p->text($sep . "\n");
                $p->setEmphasis(true);
                $this->printTotalRow($p, 'Total ventas:', $this->formatMoney($totalSales), $charsPerLine);
                $p->setEmphasis(false);
            }

            // ── Cash movements ───────────────────────────────────────────────
            $movements = $session->movements;
            if ($movements->isNotEmpty()) {
                $p->text($sep . "\n");
                $p->setEmphasis(true); $p->text("MOVIMIENTOS\n"); $p->setEmphasis(false);
                foreach ($movements as $m) {
                    /** @var \App\Models\CashMovement $m */
                    $label = ($m->type === 'cash_in' ? '+' : '-') . ' ' . $this->truncate($m->concept, $charsPerLine - 12);
                    $this->printTotalRow($p, $label . ':', $this->formatMoney($m->amount), $charsPerLine);
                }
            }

            // ── Cuadre (only for closed sessions) ────────────────────────────
            if ($session->status === 'closed') {
                $p->text($sep2 . "\n");
                $p->setEmphasis(true); $p->text("CUADRE DE CAJA\n"); $p->setEmphasis(false);
                $p->text($sep . "\n");
                $this->printTotalRow($p, '+ Fondo inicial:', $this->formatMoney($session->opening_amount), $charsPerLine);
                $this->printTotalRow($p, '+ Ventas efectivo:', $this->formatMoney($session->total_sales_cash), $charsPerLine);
                $this->printTotalRow($p, '+ Ingresos manuales:', $this->formatMoney($session->total_cash_in), $charsPerLine);
                $this->printTotalRow($p, '- Egresos manuales:', $this->formatMoney($session->total_cash_out), $charsPerLine);
                if ((float) $session->total_refunds_cash > 0) {
                    $this->printTotalRow($p, '- Devoluciones:', $this->formatMoney($session->total_refunds_cash), $charsPerLine);
                }
                $p->text($sep . "\n");
                $p->setEmphasis(true);
                $this->printTotalRow($p, '= Esperado:', $this->formatMoney($session->expected_cash), $charsPerLine);
                $this->printTotalRow($p, '  Contado:', $this->formatMoney($session->closing_amount_declared), $charsPerLine);
                $p->setEmphasis(false);
                $p->text($sep2 . "\n");
                $disc = (float) $session->discrepancy;
                $discLabel = $disc > 0 ? 'SOBRANTE:' : ($disc < 0 ? 'FALTANTE:' : 'SIN DIFERENCIA:');
                $discStr   = ($disc > 0 ? '+' : '') . $this->formatMoney(abs($disc));
                $p->setEmphasis(true);
                $this->printTotalRow($p, $discLabel, $discStr, $charsPerLine);
                $p->setEmphasis(false);
            }

            // ── Footer (arqueo — internal document, no customer message) ────
            $printedAt = \Carbon\Carbon::now('America/Bogota')->format('d/m/Y H:i');
            $p->text($sep . "\n");
            $p->setJustification(Printer::JUSTIFY_CENTER);
            $p->text("Documento de uso interno\n");
            $p->text("Impreso: " . $printedAt . "\n");
            $this->feedPastDeadZone($p);
            $p->cut();
        } finally {
            $bytes = $connector->getData();
            $printer->close();
        }

        return response()->json(['data' => base64_encode($bytes)]);
    }

    /**
     * Generate ESC/POS return receipt bytes for a sale return, base64-encoded.
     */
    public function returnReceipt(Request $request, SaleReturn $saleReturn)
    {
        $saleReturn->load(['sale.branch', 'sale.client', 'sale.seller', 'products']);

        $user = Auth::user();
        abort_if(!$user->isAdmin() && $saleReturn->sale->branch_id !== $user->branch_id, 403, 'No tienes acceso a este recibo de devolución.');

        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $cfg          = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);
        $paperWidth   = (int) $request->query('width', $cfg['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $sep  = str_repeat('-', $charsPerLine);
        $sep2 = str_repeat('=', $charsPerLine);

        $connector = new DummyPrintConnector();
        $printer   = $this->createPrinter($connector);

        try {
            $p    = $printer;
            $sale = $saleReturn->sale;

            // ── Header (same style as sale receipts) ─────────────────────────
            $this->printBusinessHeader($p, $business, $charsPerLine, $cfg);

            $p->text($sep2 . "\n");
            $p->setJustification(Printer::JUSTIFY_CENTER);
            $p->setEmphasis(true);
            $p->text("RECIBO DE DEVOLUCIÓN\n");
            $p->setEmphasis(false);
            $p->text($sep . "\n");

            // ── Return info ──────────────────────────────────────────────────
            $p->setJustification(Printer::JUSTIFY_LEFT);
            $p->setEmphasis(true); $p->text('Devol.:  '); $p->setEmphasis(false);
            $p->text(($saleReturn->id) . "\n");

            $p->setEmphasis(true); $p->text('Venta:   '); $p->setEmphasis(false);
            $p->text($sale->code . "\n");

            $p->setEmphasis(true); $p->text('Fecha:   '); $p->setEmphasis(false);
            $p->text($saleReturn->created_at->setTimezone('America/Bogota')->format('d/m/Y H:i') . "\n");

            if ($sale->client) {
                $p->setEmphasis(true); $p->text('Cliente: '); $p->setEmphasis(false);
                $p->text($this->truncate($sale->client->name, $charsPerLine - 9) . "\n");
            }
            if ($cfg['return_show_seller'] && $sale->seller) {
                $p->setEmphasis(true); $p->text('Vendedor:'); $p->setEmphasis(false);
                $p->text(' ' . $this->truncate($sale->seller->name, $charsPerLine - 10) . "\n");
            }
            if ($cfg['return_show_branch'] && $sale->branch) {
                $p->setEmphasis(true); $p->text('Sucursal:'); $p->setEmphasis(false);
                $p->text(' ' . $this->truncate($sale->branch->name, $charsPerLine - 10) . "\n");
            }
            if (($cfg['return_show_reason'] ?? true) && $saleReturn->reason) {
                $p->setEmphasis(true); $p->text('Motivo:  '); $p->setEmphasis(false);
                $p->text($this->truncate($saleReturn->reason, $charsPerLine - 9) . "\n");
            }

            $p->text($sep . "\n");

            // ── Products ─────────────────────────────────────────────────────
            if ($charsPerLine < 40) {
                $qtyW = 4; $priceW = 8; $subW = 8;
            } else {
                $qtyW = 5; $priceW = 10; $subW = 10;
            }
            $nameW = $charsPerLine - $qtyW - $priceW - $subW - ($charsPerLine < 40 ? 2 : 3);

            $p->setEmphasis(true);
            $p->text(
                str_pad('Producto', $nameW)
                . str_pad('Cant', $qtyW, ' ', STR_PAD_LEFT)
                . str_pad('Precio', $priceW, ' ', STR_PAD_LEFT)
                . str_pad('Total', $subW, ' ', STR_PAD_LEFT) . "\n"
            );
            $p->setEmphasis(false);
            $p->text($sep . "\n");

            $net = 0;
            $tax = 0;
            foreach ($saleReturn->products as $product) {
                $qty      = $product->pivot->quantity;
                $price    = $product->sale_price ?? 0;
                $subtotal = $price * $qty;
                $net     += $subtotal;
                $tax     += $subtotal * (($product->tax ?? 0) / 100);

                $p->text(
                    str_pad($this->truncate($product->name, $nameW), $nameW)
                    . str_pad(number_format($qty), $qtyW, ' ', STR_PAD_LEFT)
                    . str_pad($this->formatMoney($price), $priceW, ' ', STR_PAD_LEFT)
                    . str_pad($this->formatMoney($subtotal), $subW, ' ', STR_PAD_LEFT) . "\n"
                );
            }

            $p->text($sep . "\n");

            // ── Totals ───────────────────────────────────────────────────────
            $this->printTotalRow($p, 'Subtotal:', $this->formatMoney($net), $charsPerLine);
            if ($cfg['show_tax'] && $tax > 0) {
                $this->printTotalRow($p, 'Impuesto:', $this->formatMoney($tax), $charsPerLine);
            }
            $p->text($sep2 . "\n");
            $p->setEmphasis(true);
            $p->setTextSize(1, 2);
            $this->printTotalRow($p, 'TOTAL:', $this->formatMoney($net + $tax), $charsPerLine);
            $p->setTextSize(1, 1);
            $p->setEmphasis(false);
            $p->text($sep2 . "\n");

            // ── Code graphic (QR or barcode) ──────────────────────────────────
            $returnCodeGraphic = $cfg['return_code_graphic'] ?? 'none';
            if ($returnCodeGraphic !== 'none') {
                $p->text(str_repeat('-', $charsPerLine) . "\n");
                $this->printCodeGraphic($p, (string) $saleReturn->id, $returnCodeGraphic);
            }

            // ── Footer (return-specific lines) ────────────────────────────────
            $cfg['footer_line1'] = $cfg['return_footer_line1'] ?? 'Devolución procesada.';
            $cfg['footer_line2'] = $cfg['return_footer_line2'] ?? 'Gracias por su preferencia.';
            $this->printFooter($p, $charsPerLine, $cfg);
        } finally {
            $bytes = $connector->getData();
            $printer->close();
        }

        return response()->json([
            'data' => base64_encode($bytes),
            'id'   => $saleReturn->id,
        ]);
    }

    /**
     * Generate a test ESC/POS page (simple connectivity check).
     */
    public function test(Request $request)
    {
        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $cfg          = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);
        $paperWidth   = (int) $request->query('width', $cfg['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $sep  = str_repeat('-', $charsPerLine);
        $sep2 = str_repeat('=', $charsPerLine);

        $connector = new DummyPrintConnector();
        $printer   = $this->createPrinter($connector);

        try {
            $p = $printer;

            $p->setLineSpacing();  // ESC 2: reset to default
            $p->setEmphasis(false);
            $p->setTextSize(1, 1);
            $p->setJustification(Printer::JUSTIFY_CENTER);

            // Small top margin (same as printBusinessHeader)
            $conn = $p->getPrintConnector();
            for ($i = 0; $i < 4; $i++) {
                $conn->write("\x1b\x4a\x18"); // ESC J 24
            }

            $p->setTextSize(2, 2);
            $p->text("Stokity POS\n");
            $p->setTextSize(1, 1);
            $p->text("Prueba de impresora\n");
            $p->text($sep2 . "\n");
            $p->setJustification(Printer::JUSTIFY_LEFT);
            $p->text("Ancho: {$paperWidth} mm   Cols: {$charsPerLine}\n");
            $p->text("Fecha: " . now()->setTimezone('America/Bogota')->format('d/m/Y H:i') . "\n");
            $p->text($sep . "\n");
            $p->setJustification(Printer::JUSTIFY_CENTER);
            $p->setEmphasis(true);
            $p->text("Si ves este recibo,\n");
            $p->text("la impresora funciona!\n");
            $p->setEmphasis(false);
            $p->text($sep2 . "\n");
            $this->feedPastDeadZone($p);
            $p->cut();
        } finally {
            $bytes = $connector->getData();
            $printer->close();
        }

        return response()->json(['data' => base64_encode($bytes)]);
    }

    /**
     * Generate ESC/POS with sample data to preview the ticket template.
     *
     * When called via POST (from the settings page "Imprimir prueba" button),
     * the request body may contain the full unsaved config from the form.
     * Those values override the DB config so the user can preview changes
     * before saving. When called via GET (legacy / test), only ?width= is used.
     */
    public function testTemplate(Request $request)
    {
        $business  = BusinessSetting::getSettings();
        $dbConfig  = $business->getTicketConfig();

        // Merge form config (POST body) over DB config — allows preview of
        // unsaved changes. Only recognised keys are merged; unknown keys ignored.
        $formConfig = [];
        if ($request->isMethod('POST')) {
            $allowed    = array_merge(array_keys(BusinessSetting::TICKET_DEFAULTS), ['template_type']);
            $bodyValues = $request->only($allowed);
            // Remove nulls (keys the form did not send) so DB values fill the gaps.
            // Keep false booleans — they are intentional "hide" settings.
            $formConfig = array_filter($bodyValues, fn($v) => $v !== null);
            if (isset($formConfig['paper_width'])) {
                $formConfig['paper_width'] = (int) $formConfig['paper_width'];
            }
        }

        $templateType = $formConfig['template_type'] ?? 'sale';
        unset($formConfig['template_type']);

        $config       = array_merge($dbConfig, $formConfig);
        $paperWidth   = (int) ($config['paper_width'] ?? $dbConfig['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $connector = new DummyPrintConnector();
        $printer   = $this->createPrinter($connector);

        try {
            if ($templateType === 'return') {
                $this->printReturnTemplate($printer, $business, $charsPerLine, $config);
            } else {
                $this->printSaleTemplate($printer, $business, $charsPerLine, $config);
            }
        } finally {
            $bytes = $connector->getData();
            $printer->close();
        }

        return response()->json(['data' => base64_encode($bytes)]);
    }

    /**
     * Generate a sample sale receipt for template preview.
     */
    private function printSaleTemplate(Printer $p, BusinessSetting $biz, int $cols, array $config): void
    {
        $sale = new \stdClass();
        $sale->code           = '20260303154938742';
        $sale->created_at     = now()->setTimezone('America/Bogota');
        $sale->net            = 24500;
        $sale->tax            = 1500;
        $sale->discount_type  = 'percentage';
        $sale->discount_value = 10;
        $sale->discount_amount = 2600;
        $sale->total          = 23400;
        $sale->payment_method = 'cash';
        $sale->amount_paid    = 25000;
        $sale->change_amount  = 1600;
        $sale->notes          = null;

        $sale->client = (object) ['name' => 'Consumidor Final'];
        $sale->seller = (object) ['name' => 'Administrador User'];
        $sale->branch = (object) ['name' => 'Sucursal Principal'];

        $sale->saleProducts = collect([
            (object) ['quantity' => 2, 'price' => 7500, 'subtotal' => 15000,
                'product' => (object) ['name' => 'Chocolate Bon Bon']],
            (object) ['quantity' => 1, 'price' => 5000, 'subtotal' => 5000,
                'product' => (object) ['name' => 'Gaseosa 2L']],
            (object) ['quantity' => 3, 'price' => 1500, 'subtotal' => 4500,
                'product' => (object) ['name' => 'Chicle Trident Pack']],
        ]);

        $this->printReceipt($p, $sale, $biz, $cols, $config);
    }

    /**
     * Generate a sample return receipt for template preview.
     */
    private function printReturnTemplate(Printer $p, BusinessSetting $biz, int $cols, array $config): void
    {
        $cfg = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);

        $sep  = str_repeat('-', $cols);
        $sep2 = str_repeat('=', $cols);

        // ── Header ──────────────────────────────────────────────────────────
        $this->printBusinessHeader($p, $biz, $cols, $cfg);

        $p->text($sep2 . "\n");
        $p->setJustification(Printer::JUSTIFY_CENTER);
        $p->setEmphasis(true);
        $p->text("RECIBO DE DEVOLUCIÓN\n");
        $p->setEmphasis(false);
        $p->text($sep . "\n");

        // ── Return info ──────────────────────────────────────────────────────
        $p->setJustification(Printer::JUSTIFY_LEFT);
        $p->setEmphasis(true); $p->text('Devol.:  '); $p->setEmphasis(false);
        $p->text("42\n");

        $p->setEmphasis(true); $p->text('Venta:   '); $p->setEmphasis(false);
        $p->text("20260303154938742\n");

        $p->setEmphasis(true); $p->text('Fecha:   '); $p->setEmphasis(false);
        $p->text(now()->setTimezone('America/Bogota')->format('d/m/Y H:i') . "\n");

        $p->setEmphasis(true); $p->text('Cliente: '); $p->setEmphasis(false);
        $p->text("Consumidor Final\n");

        if ($cfg['return_show_seller']) {
            $p->setEmphasis(true); $p->text('Vendedor:'); $p->setEmphasis(false);
            $p->text(" Administrador User\n");
        }
        if ($cfg['return_show_branch']) {
            $p->setEmphasis(true); $p->text('Sucursal:'); $p->setEmphasis(false);
            $p->text(" Sucursal Principal\n");
        }
        if ($cfg['return_show_reason'] ?? true) {
            $p->setEmphasis(true); $p->text('Motivo:  '); $p->setEmphasis(false);
            $p->text("Producto en mal estado\n");
        }

        $p->text($sep . "\n");

        // ── Products ─────────────────────────────────────────────────────────
        if ($cols < 40) {
            $qtyW = 4; $priceW = 8; $subW = 8;
        } else {
            $qtyW = 5; $priceW = 10; $subW = 10;
        }
        $nameW = $cols - $qtyW - $priceW - $subW - ($cols < 40 ? 2 : 3);

        $p->setEmphasis(true);
        $p->text(
            str_pad('Producto', $nameW)
            . str_pad('Cant', $qtyW, ' ', STR_PAD_LEFT)
            . str_pad('Precio', $priceW, ' ', STR_PAD_LEFT)
            . str_pad('Total', $subW, ' ', STR_PAD_LEFT) . "\n"
        );
        $p->setEmphasis(false);
        $p->text($sep . "\n");

        $p->text(
            str_pad($this->truncate('Chocolate Bon Bon', $nameW), $nameW)
            . str_pad('1', $qtyW, ' ', STR_PAD_LEFT)
            . str_pad($this->formatMoney(7500), $priceW, ' ', STR_PAD_LEFT)
            . str_pad($this->formatMoney(7500), $subW, ' ', STR_PAD_LEFT) . "\n"
        );

        $p->text($sep . "\n");

        // ── Totals ───────────────────────────────────────────────────────────
        $this->printTotalRow($p, 'Subtotal:', $this->formatMoney(7500), $cols);
        $p->text($sep2 . "\n");
        $p->setEmphasis(true);
        $p->setTextSize(1, 2);
        $this->printTotalRow($p, 'TOTAL:', $this->formatMoney(7500), $cols);
        $p->setTextSize(1, 1);
        $p->setEmphasis(false);
        $p->text($sep2 . "\n");

        // ── Code graphic ──────────────────────────────────────────────────────
        $returnCodeGraphic = $cfg['return_code_graphic'] ?? 'none';
        if ($returnCodeGraphic !== 'none') {
            $p->text($sep . "\n");
            $this->printCodeGraphic($p, '42', $returnCodeGraphic);
        }

        // ── Footer ───────────────────────────────────────────────────────────
        $cfg['footer_line1'] = $cfg['return_footer_line1'] ?? 'Devolución procesada.';
        $cfg['footer_line2'] = $cfg['return_footer_line2'] ?? 'Gracias por su preferencia.';
        $this->printFooter($p, $cols, $cfg);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Create a Printer instance with a clean byte buffer.
     *
     * The Printer constructor always calls initialize() which sends ESC @
     * (0x1B 0x40). On many thermal printers this command retracts the paper,
     * pulling the top of the receipt into the dead zone between the print head
     * and the cutter blade — causing the header to be cut off on subsequent
     * prints. We clear the DummyPrintConnector buffer immediately after
     * construction to strip those bytes from the output.
     */
    private function createPrinter(DummyPrintConnector $connector): Printer
    {
        $printer = new Printer($connector);
        $connector->clear();

        return $printer;
    }

    /**
     * Print the standardized business header: logo, name, NIT, address, phone.
     * Used by all receipt types to ensure a consistent look.
     */
    private function printBusinessHeader(Printer $p, BusinessSetting $biz, int $cols, array $cfg): void
    {
        // Full manual reset — since we removed ESC @ (which retracts paper),
        // we must explicitly reset ALL relevant settings. The previous print
        // job may have left line spacing at a tiny value (e.g. 16 dots from
        // logo column-format printing), making LF feeds nearly useless.
        $p->setLineSpacing();  // ESC 2: reset to default (~30 dots per line)
        $p->setEmphasis(false);
        $p->setTextSize(1, 1);
        $p->setJustification(Printer::JUSTIFY_CENTER);

        // Small top margin: 4 × ESC J 24 = 96 dots ≈ 12mm.
        // This bridges any gap between the previous receipt's bottom feed and
        // the dead zone (distance between print head and cutter blade, ~20-25mm
        // on typical 58mm printers). Combined with the ~24mm bottom feed from
        // feedPastDeadZone() at the end of the previous receipt, this gives
        // ~36mm of total clearance — enough for any thermal printer.
        // For the first receipt of the day (no previous bottom feed), this 12mm
        // ensures at least partial coverage of the dead zone.
        $conn = $p->getPrintConnector();
        for ($i = 0; $i < 4; $i++) {
            $conn->write("\x1b\x4a\x18"); // ESC J 24
        }

        // Logo (optional)
        if (!empty($cfg['show_logo']) && $biz->logo) {
            $this->printLogo($p, $biz->logo);
        }

        // Business name
        if ($cfg['header_size'] === 'large') {
            $p->setTextSize(2, 2);
            $p->text($this->truncate($biz->name, (int) ($cols / 2)) . "\n");
            $p->setTextSize(1, 1);
        } else {
            $p->setEmphasis(true);
            $p->text($this->truncate($biz->name, $cols) . "\n");
            $p->setEmphasis(false);
        }

        if ($cfg['show_nit'] && $biz->nit) {
            $p->text('NIT: ' . $biz->nit . "\n");
        }
        if ($cfg['show_address'] && $biz->address) {
            $p->text($this->wrapCenter($biz->address, $cols) . "\n");
        }
        if ($cfg['show_phone'] && $biz->phone) {
            $p->text('Tel: ' . $biz->phone . "\n");
        }
    }

    /**
     * Print a logo image using ESC * column format with correct 24-dot spacing.
     */
    private function printLogo(Printer $p, string $logo): void
    {
        $tmpFile = null;
        try {
            if (str_starts_with($logo, 'http')) {
                $logoPath = $this->downloadToTempFile($logo);
                $tmpFile  = $logoPath;
            } else {
                $logoPath = public_path('uploads/business/' . $logo);
            }

            if (empty($logoPath) || !file_exists($logoPath)) {
                return;
            }

            // Only print if we can produce a clean B&W resized PNG.
            // Never fall back to the original — it may be huge and cause
            // many blank ESC* passes, wasting paper.
            $resized = $this->resizeLogoForPrint($logoPath);
            if ($resized === null) {
                return;
            }

            $image = EscposImage::load($resized, false);

            // Print logo using ESC * (column format) with correct 24-dot line spacing.
            //
            // Why NOT bitImage() (GS v 0 raster): many 58mm printers don't support
            // this command and print the raw bytes as garbled text characters instead.
            //
            // Why NOT the library's bitImageColumnFormat(): it hardcodes
            //   setLineSpacing(16) inside, but each band is 24 dots tall,
            //   leaving 8-dot white gaps (horizontal lines) between bands.
            //
            // Fix: write ESC * bytes manually with ESC J 24 (immediate paper feed)
            // so each band advances exactly 24 dots — no gaps.
            try {
                $colData   = $image->toColumnFormat(true); // high-density 24-dot bands
                $imgWidth  = $image->getWidth();
                $nL        = $imgWidth & 0xFF;
                $nH        = ($imgWidth >> 8) & 0xFF;
                $escHeader = "\x1b\x2a\x21" . chr($nL) . chr($nH); // ESC * 33 nL nH
                $conn      = $p->getPrintConnector();

                foreach ($colData as $rowData) {
                    $conn->write($escHeader . $rowData . "\x1b\x4a\x18");
                    // ESC J 24 = feed exactly 24 dots (matches 24-dot band height)
                }
            } catch (\Throwable) {
                // Last resort fallback — image may have horizontal lines
                $p->bitImageColumnFormat($image, Printer::IMG_DEFAULT);
            }

            $p->text("\n");
            @unlink($resized);
        } catch (\Throwable $e) {
            \Log::warning('printLogo failed: ' . $e->getMessage(), ['logo' => $logo]);
        } finally {
            if ($tmpFile && file_exists($tmpFile)) {
                @unlink($tmpFile);
            }
        }
    }

    /**
     * Print the standardized footer: separator, footer lines, feed and cut.
     * Used by all receipt types to ensure a consistent ending.
     */
    private function printFooter(Printer $p, int $cols, array $cfg): void
    {
        $sep = str_repeat('-', $cols);

        $p->text($sep . "\n");
        $p->setJustification(Printer::JUSTIFY_CENTER);

        $footer1 = $cfg['footer_line1'] ?? '¡Gracias por su compra!';
        $footer2 = $cfg['footer_line2'] ?? 'Vuelva pronto';

        if ($footer1) {
            $p->text($footer1 . "\n");
        }
        if ($footer2) {
            $p->text($footer2 . "\n");
        }

        $this->feedPastDeadZone($p);
        $p->cut();
    }

    /**
     * Feed enough paper so all printed content clears the dead zone between
     * the print head and the cutter blade before cutting.
     *
     * On thermal printers, after a cut the paper edge sits at the cutter blade
     * while the print head is ~20-25mm above it (closer to the roll). If the
     * next receipt starts printing immediately, its first ~25mm would be hidden
     * inside the printer body. By feeding generously at the END of each receipt
     * (before the cut), we push all content past the cutter so it's visible,
     * and the blank paper that remains inside the printer becomes the (invisible)
     * top of the next receipt — which starts printing with no wasted space.
     *
     * ESC J n feeds n dots immediately (max 255 per command, ~32mm at 203 DPI).
     * We use 8 × ESC J 24 = 192 dots ≈ 24mm — enough for typical 58mm printers
     * (~20-25mm dead zone) without excessive paper waste.
     */
    private function feedPastDeadZone(Printer $p): void
    {
        $conn = $p->getPrintConnector();
        for ($i = 0; $i < 8; $i++) {
            $conn->write("\x1b\x4a\x18"); // ESC J 24 = 24 dots per command
        }
    }

    /**
     * Generate a complete sale receipt on the given Printer.
     */
    private function printReceipt(Printer $p, object $sale, BusinessSetting $biz, int $cols, array $config = []): void
    {
        $cfg = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);

        $sep  = str_repeat('-', $cols);
        $sep2 = str_repeat('=', $cols);

        // ── Header ──────────────────────────────────────────────────────────
        $this->printBusinessHeader($p, $biz, $cols, $cfg);

        $p->text($sep2 . "\n");

        // ── Sale info ────────────────────────────────────────────────────────
        $p->setJustification(Printer::JUSTIFY_LEFT);
        $p->setEmphasis(true);
        $p->text('Recibo:  ');
        $p->setEmphasis(false);
        $p->text($sale->code . "\n");

        $p->setEmphasis(true);
        $p->text('Fecha:   ');
        $p->setEmphasis(false);
        $date = ($sale->created_at instanceof \Carbon\Carbon)
            ? $sale->created_at->setTimezone('America/Bogota')->format('d/m/Y H:i')
            : now()->format('d/m/Y H:i');
        $p->text($date . "\n");

        if ($sale->client) {
            $p->setEmphasis(true);
            $p->text('Cliente: ');
            $p->setEmphasis(false);
            $p->text($this->truncate($sale->client->name, $cols - 9) . "\n");
        }

        if ($cfg['show_seller'] && $sale->seller) {
            $p->setEmphasis(true);
            $p->text('Vendedor:');
            $p->setEmphasis(false);
            $p->text(' ' . $this->truncate($sale->seller->name, $cols - 10) . "\n");
        }

        if ($cfg['show_branch'] && $sale->branch) {
            $p->setEmphasis(true);
            $p->text('Sucursal:');
            $p->setEmphasis(false);
            $p->text(' ' . $this->truncate($sale->branch->name, $cols - 10) . "\n");
        }

        $p->text($sep . "\n");

        // ── Products ─────────────────────────────────────────────────────────
        if ($cols < 40) {
            $qtyW   = 4;
            $priceW = 8;
            $subW   = 8;
            $nameW  = $cols - $qtyW - $priceW - $subW - 2;
        } else {
            $qtyW   = 5;
            $priceW = 10;
            $subW   = 10;
            $nameW  = $cols - $qtyW - $priceW - $subW - 3;
        }

        $p->setEmphasis(true);
        $p->text(
            str_pad('Producto', $nameW)
            . str_pad('Cant', $qtyW, ' ', STR_PAD_LEFT)
            . str_pad('Precio', $priceW, ' ', STR_PAD_LEFT)
            . str_pad('Total', $subW, ' ', STR_PAD_LEFT)
            . "\n"
        );
        $p->setEmphasis(false);
        $p->text($sep . "\n");

        foreach ($sale->saleProducts as $item) {
            $name = $this->truncate($item->product?->name ?? 'Producto', $nameW); // @phpstan-ignore nullsafe.neverNull
            $qty  = number_format($item->quantity);
            $pri  = $this->formatMoney($item->price);
            $sub  = $this->formatMoney($item->subtotal ?? ($item->price * $item->quantity));

            $p->text(
                str_pad($name, $nameW)
                . str_pad($qty, $qtyW, ' ', STR_PAD_LEFT)
                . str_pad($pri, $priceW, ' ', STR_PAD_LEFT)
                . str_pad($sub, $subW, ' ', STR_PAD_LEFT)
                . "\n"
            );
        }

        $p->text($sep . "\n");

        // ── Totals ───────────────────────────────────────────────────────────
        $this->printTotalRow($p, 'Subtotal:', $this->formatMoney($sale->net), $cols);

        if ($cfg['show_tax'] && (float) $sale->tax > 0) {
            $this->printTotalRow($p, 'Impuesto:', $this->formatMoney($sale->tax), $cols);
        }

        if ($sale->discount_type !== 'none' && (float) $sale->discount_amount > 0) {
            $label = 'Descuento:';
            if ($sale->discount_type === 'percentage') {
                $pct = number_format($sale->discount_value, 0);
                $label = $cols < 40 ? "Descto ({$pct}%):" : "Descuento ({$pct}%):";
            }
            $this->printTotalRow($p, $label, '- ' . $this->formatMoney($sale->discount_amount), $cols);
        }

        $p->text($sep2 . "\n");
        $p->setEmphasis(true);
        $p->setTextSize(1, 2);
        $this->printTotalRow($p, 'TOTAL:', $this->formatMoney($sale->total), $cols);
        $p->setTextSize(1, 1);
        $p->setEmphasis(false);
        $p->text($sep . "\n");

        // ── Payment info ─────────────────────────────────────────────────────
        $payLabel = $sale->payment_method ?? '';
        $payNames = ['cash' => 'Efectivo', 'nequi' => 'Nequi', 'card' => 'Tarjeta'];
        $payLabel = $payNames[strtolower($payLabel)] ?? ucfirst($payLabel);

        $this->printTotalRow($p, 'Metodo pago:', $payLabel, $cols);

        if (strtolower($sale->payment_method ?? '') === 'cash' && (float) $sale->amount_paid > 0) {
            $recLabel = $cols < 40 ? 'Efectivo:' : 'Efectivo recibido:';
            $this->printTotalRow($p, $recLabel, $this->formatMoney($sale->amount_paid), $cols);

            $change = (float) $sale->change_amount;
            if ($change > 0) {
                $this->printTotalRow($p, 'Cambio:', $this->formatMoney($change), $cols);
            }
        }

        if ($sale->notes) {
            $p->text($sep . "\n");
            $p->text('Nota: ' . $this->truncate($sale->notes, $cols - 6) . "\n");
        }

        // ── Code graphic (QR or barcode) ──────────────────────────────────────
        $saleCodeGraphic = $cfg['sale_code_graphic'] ?? 'none';
        if ($saleCodeGraphic !== 'none') {
            $p->text($sep . "\n");
            $this->printCodeGraphic($p, (string) $sale->code, $saleCodeGraphic);
        }

        // ── Footer ───────────────────────────────────────────────────────────
        $p->text($sep2 . "\n");
        $this->printFooter($p, $cols, $cfg);
    }

    /**
     * Print a QR code (as a raster bitmap via ESC *) or a CODE128 barcode.
     *
     * QR codes are software-rendered with chillerlan/php-qrcode and sent as
     * ESC * column-format bands — the same technique used for logos.  This
     * avoids relying on the printer's native GS ( k command, which many cheap
     * 58 mm printers silently ignore or do not implement.
     *
     * CODE128 still uses the native GS k command (widely supported).
     */
    private function printCodeGraphic(Printer $p, string $code, string $type): void
    {
        if ($type === 'none' || $code === '') {
            return;
        }

        $p->setJustification(Printer::JUSTIFY_CENTER);

        if ($type === 'qr') {
            $this->printQrBitmap($p, $code);
        } elseif ($type === 'barcode') {
            $this->printBarcodeBitmap($p, $code);
        }

        $p->text("\n");
        $p->setJustification(Printer::JUSTIFY_LEFT);
    }

    /**
     * Render a QR code as a 1-bit ESC * (column-format) bitmap.
     *
     * Uses chillerlan/php-qrcode to generate a clean black-on-white PNG,
     * then pushes each 24-dot band using the same manual ESC * + ESC J 24
     * approach that works for logos on this printer model.
     */
    private function printQrBitmap(Printer $p, string $data): void
    {
        if (!class_exists(\chillerlan\QRCode\QRCode::class) || !extension_loaded('gd')) {
            // Fallback: try native QR command (may not work on all printers)
            try {
                $p->qrCode($data, Printer::QR_ECLEVEL_M, 6, Printer::QR_MODEL_2);
            } catch (\Throwable) {}
            return;
        }

        try {
            $options = new \chillerlan\QRCode\QROptions([
                'outputType'    => \chillerlan\QRCode\QRCode::OUTPUT_IMAGE_PNG,
                'eccLevel'      => \chillerlan\QRCode\QRCode::ECC_M,
                'scale'         => 8,           // 8 px/module → ~240 px for typical codes
                'outputBase64'  => false,
                'addQuietzone'  => true,
                'quietzoneSize' => 2,
            ]);

            $pngData = (new \chillerlan\QRCode\QRCode($options))->render($data);

            // Save to a temp file so resizeLogoForPrint() can process it
            $tmpQr = tempnam(sys_get_temp_dir(), 'stokity_qr_') . '.png';
            file_put_contents($tmpQr, $pngData);

            // Convert to 1-bit (grayscale + threshold), capped at 360 × 360 px
            $processed = $this->resizeLogoForPrint($tmpQr, 360, 360);
            @unlink($tmpQr);

            if ($processed === null) {
                return;
            }

            // Print via ESC * column format (same as logo, gap-free with ESC J 24).
            // IMPORTANT: EscposImage uses lazy loading — getWidth() returns 0 until
            // toColumnFormat() (or similar) forces the image to be read from disk.
            // Always call toColumnFormat() first, then getWidth().
            $image   = EscposImage::load($processed, false);
            $colData = $image->toColumnFormat(true); // forces image load, caches result
            $imgWidth = $image->getWidth();
            $nL       = $imgWidth & 0xFF;
            $nH       = ($imgWidth >> 8) & 0xFF;
            $header   = "\x1b\x2a\x21" . chr($nL) . chr($nH); // ESC * 33 nL nH
            $conn     = $p->getPrintConnector();

            foreach ($colData as $rowData) {
                $conn->write($header . $rowData . "\x1b\x4a\x18"); // ESC J 24 per band
            }

            @unlink($processed);
        } catch (\Throwable $e) {
            \Log::warning('printQrBitmap failed: ' . $e->getMessage(), ['data' => $data]);
        }
    }

    /**
     * Render a CODE128 barcode as a 1-bit ESC * (column-format) bitmap.
     *
     * Uses picqer/php-barcode-generator to build a PNG, then converts it to
     * a B&W raster and sends it via the same ESC * + ESC J 24 band approach
     * used for logos and QR codes.  The barcode number is also printed as
     * plain text below for readability.
     */
    private function printBarcodeBitmap(Printer $p, string $data): void
    {
        if (!class_exists(\Picqer\Barcode\BarcodeGeneratorPNG::class) || !extension_loaded('gd')) {
            return;
        }

        try {
            $gen     = new \Picqer\Barcode\BarcodeGeneratorPNG();
            // widthFactor=2 → ~290 px wide (fits 58mm); height=80 px ≈ 10 mm (scannable)
            $pngData = $gen->getBarcode(
                $data,
                \Picqer\Barcode\BarcodeGenerator::TYPE_CODE_128,
                2,   // widthFactor
                80,  // height (px)
                [0, 0, 0]
            );

            $tmpBar = tempnam(sys_get_temp_dir(), 'stokity_bar_') . '.png';
            file_put_contents($tmpBar, $pngData);

            // Convert to 1-bit, capped at 360 × 120 px to preserve bar height
            $processed = $this->resizeLogoForPrint($tmpBar, 360, 120);
            @unlink($tmpBar);

            if ($processed === null) {
                return;
            }

            $image    = EscposImage::load($processed, false);
            $colData  = $image->toColumnFormat(true); // force load FIRST
            $imgWidth = $image->getWidth();
            $nL       = $imgWidth & 0xFF;
            $nH       = ($imgWidth >> 8) & 0xFF;
            $header   = "\x1b\x2a\x21" . chr($nL) . chr($nH);
            $conn     = $p->getPrintConnector();

            foreach ($colData as $rowData) {
                $conn->write($header . $rowData . "\x1b\x4a\x18");
            }

            @unlink($processed);

            // Print the code as text below the barcode for readability
            $p->text($data . "\n");
        } catch (\Throwable $e) {
            \Log::warning('printBarcodeBitmap failed: ' . $e->getMessage(), ['data' => $data]);
        }
    }

    private function printTotalRow(Printer $p, string $label, string $value, int $cols): void
    {
        $valueW = $cols >= 40 ? 18 : 13;
        $labelW = $cols - $valueW;
        $p->text(
            str_pad($label, $labelW)
            . str_pad($value, $valueW, ' ', STR_PAD_LEFT)
            . "\n"
        );
    }

    private function formatMoney(float|string $value): string
    {
        $num = is_string($value) ? (float) $value : $value;
        return '$' . number_format($num, 0, ',', '.');
    }

    private function truncate(string $text, int $max): string
    {
        if ($max <= 0) return '';
        if (mb_strlen($text) <= $max) return $text;
        return mb_substr($text, 0, $max - 1) . '.';
    }

    private function wrapCenter(string $text, int $cols): string
    {
        if (mb_strlen($text) <= $cols) {
            return str_pad($text, $cols, ' ', STR_PAD_BOTH);
        }
        return mb_substr($text, 0, $cols);
    }

    /**
     * Download a remote URL to a temp file and return its path, or null on failure.
     */
    private function downloadToTempFile(string $url): ?string
    {
        $tmpFile = null;
        try {
            if (function_exists('curl_init')) {
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_SSL_VERIFYPEER => true,
                ]);
                $imgData    = curl_exec($ch);
                $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                curl_close($ch);

                if ($imgData === false || $httpCode !== 200) {
                    return null;
                }

                $ext = match (true) {
                    str_contains((string) $contentType, 'webp') => 'webp',
                    str_contains((string) $contentType, 'png')  => 'png',
                    str_contains((string) $contentType, 'gif')  => 'gif',
                    default                                      => 'jpg',
                };
            } else {
                $imgData = @file_get_contents($url);
                if ($imgData === false) {
                    return null;
                }
                $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION)) ?: 'jpg';
            }

            $tmpFile = sys_get_temp_dir() . '/stokity_logo_' . uniqid() . '.' . $ext;
            file_put_contents($tmpFile, $imgData);
            return $tmpFile;
        } catch (\Throwable) {
            if ($tmpFile && file_exists($tmpFile)) {
                @unlink($tmpFile);
            }
            return null;
        }
    }

    /**
     * Resize, dither and threshold a logo image for ESC/POS printing.
     * Returns path to a temporary 1-bit-style PNG, or null on failure.
     */
    private function resizeLogoForPrint(string $srcPath, int $maxWidth = 360, int $maxHeight = 140): ?string
    {
        if (!extension_loaded('gd')) {
            return null;
        }
        try {
            $mime = mime_content_type($srcPath);
            $src  = match (true) {
                str_contains($mime, 'png')  => imagecreatefrompng($srcPath),
                str_contains($mime, 'jpeg') => imagecreatefromjpeg($srcPath),
                str_contains($mime, 'gif')  => imagecreatefromgif($srcPath),
                str_contains($mime, 'webp') => imagecreatefromwebp($srcPath),
                default                     => null,
            };
            if (!$src) {
                return null;
            }

            $origW = imagesx($src);
            $origH = imagesy($src);

            $scale = min(1.0, $maxWidth / $origW, $maxHeight / $origH);
            $newW  = (int) (ceil($origW * $scale / 8) * 8);
            $newH  = max(1, (int) round($origH * $scale));

            $dst   = imagecreatetruecolor($newW, $newH);
            $white = imagecolorallocate($dst, 255, 255, 255);
            $black = imagecolorallocate($dst, 0, 0, 0);

            imagefill($dst, 0, 0, $white);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            imagedestroy($src);

            imagefilter($dst, IMG_FILTER_GRAYSCALE);
            imagefilter($dst, IMG_FILTER_BRIGHTNESS, -20);
            imagefilter($dst, IMG_FILTER_CONTRAST, -70);

            for ($y = 0; $y < $newH; $y++) {
                for ($x = 0; $x < $newW; $x++) {
                    $c = imagecolorat($dst, $x, $y);
                    imagesetpixel($dst, $x, $y, (($c >> 16) & 0xFF) < 160 ? $black : $white);
                }
            }

            $tmpFile = tempnam(sys_get_temp_dir(), 'stokity_logo_r_') . '.png';
            imagepng($dst, $tmpFile);
            imagedestroy($dst);

            return $tmpFile;
        } catch (\Throwable) {
            return null;
        }
    }
}
