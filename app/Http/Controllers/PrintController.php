<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
        $sale->load(['branch', 'client', 'seller', 'saleProducts.product']);

        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $paperWidth   = (int) $request->query('width', $config['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $connector = new DummyPrintConnector();
        $printer   = new Printer($connector);

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
     * Generate a test ESC/POS page (simple connectivity check).
     */
    public function test(Request $request)
    {
        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $paperWidth   = (int) $request->query('width', $config['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        $connector = new DummyPrintConnector();
        $printer   = new Printer($connector);

        $sep  = str_repeat('-', $charsPerLine);
        $sep2 = str_repeat('=', $charsPerLine);

        $printer->initialize();
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->setTextSize(2, 2);
        $printer->text("Stokity POS\n");
        $printer->setTextSize(1, 1);
        $printer->text("Prueba de impresora\n");
        $printer->text($sep2 . "\n");
        $printer->setJustification(Printer::JUSTIFY_LEFT);
        $printer->text("Ancho: {$paperWidth} mm   Cols: {$charsPerLine}\n");
        $printer->text("Fecha: " . now()->setTimezone('America/Bogota')->format('d/m/Y H:i') . "\n");
        $printer->text($sep . "\n");
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->setEmphasis(true);
        $printer->text("Si ves este recibo,\n");
        $printer->text("la impresora funciona!\n");
        $printer->setEmphasis(false);
        $printer->text($sep2 . "\n");
        $printer->feed(4);
        $printer->cut();

        $bytes = $connector->getData();
        $printer->close();

        return response()->json(['data' => base64_encode($bytes)]);
    }

    /**
     * Generate ESC/POS with sample data to preview the ticket template.
     */
    public function testTemplate(Request $request)
    {
        $business     = BusinessSetting::getSettings();
        $config       = $business->getTicketConfig();
        $paperWidth   = (int) $request->query('width', $config['paper_width']);
        $charsPerLine = $paperWidth >= 80 ? 48 : 32;

        // Build a fake sale using a plain object
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

        $connector = new DummyPrintConnector();
        $printer   = new Printer($connector);

        $this->printReceipt($printer, $sale, $business, $charsPerLine, $config);

        $bytes = $connector->getData();
        $printer->close();

        return response()->json(['data' => base64_encode($bytes)]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function printReceipt(Printer $p, object $sale, BusinessSetting $biz, int $cols, array $config = []): void
    {
        // Merge defaults so we never have undefined keys
        $cfg = array_merge(BusinessSetting::TICKET_DEFAULTS, $config);

        $sep  = str_repeat('-', $cols);
        $sep2 = str_repeat('=', $cols);

        // ── Header ──────────────────────────────────────────────────────────
        $p->initialize();
        $p->setJustification(Printer::JUSTIFY_CENTER);

        // Logo (optional)
        if (!empty($cfg['show_logo']) && $biz->logo) {
            $tmpFile = null;
            try {
                if (str_starts_with($biz->logo, 'http')) {
                    $imgData = @file_get_contents($biz->logo);
                    if ($imgData !== false) {
                        // Keep extension so GdEscposImage can detect format
                        $urlExt  = strtolower(pathinfo(parse_url($biz->logo, PHP_URL_PATH), PATHINFO_EXTENSION)) ?: 'jpg';
                        $tmpFile = tempnam(sys_get_temp_dir(), 'stokity_logo_') . '.' . $urlExt;
                        file_put_contents($tmpFile, $imgData);
                        $logoPath = $tmpFile;
                    }
                } else {
                    $logoPath = public_path('uploads/business/' . $biz->logo);
                }
                if (!empty($logoPath) && file_exists($logoPath)) {
                    // Only print if we can produce a clean B&W resized PNG.
                    // Never fall back to the original — it may be huge and cause
                    // many blank ESC* passes, wasting paper.
                    $resized = $this->resizeLogoForPrint($logoPath);
                    if ($resized !== null) {
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
                        // Fix: write ESC * bytes manually with ESC 3 24 (line spacing = 24 dots)
                        // so each line feed advances exactly one band height — no gaps.
                        try {
                            $colData   = $image->toColumnFormat(true); // high-density 24-dot bands
                            $imgWidth  = $image->getWidth();
                            $nL        = $imgWidth & 0xFF;
                            $nH        = ($imgWidth >> 8) & 0xFF;
                            $escHeader = "\x1b\x2a\x21" . chr($nL) . chr($nH); // ESC * 33 nL nH
                            $conn      = $p->getPrintConnector();
                            // The printer ignores ESC 3 in column format mode.
                            // Use ESC J n (immediate paper feed, n dots) instead of \n,
                            // bypassing the line spacing setting entirely.
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
                    }
                }
            } catch (\Throwable $e) {
                // Silently skip if image can't be printed
            } finally {
                if ($tmpFile && file_exists($tmpFile)) {
                    unlink($tmpFile);
                }
            }
        }

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
            // 58mm compact layout
            $qtyW   = 4;
            $priceW = 8;
            $subW   = 8;
            $nameW  = $cols - $qtyW - $priceW - $subW - 2;
        } else {
            // 80mm layout
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
            $name = $this->truncate($item->product?->name ?? 'Producto', $nameW);
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
                // Keep label short on 58mm
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
        // Translate common codes to readable names
        $payNames = ['cash' => 'Efectivo', 'nequi' => 'Nequi', 'card' => 'Tarjeta'];
        $payLabel = $payNames[strtolower($payLabel)] ?? ucfirst($payLabel);

        $this->printTotalRow($p, 'Metodo pago:', $payLabel, $cols);

        if (strtolower($sale->payment_method ?? '') === 'cash' && (float) $sale->amount_paid > 0) {
            // Short label on 58mm to avoid wrapping
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

        // ── Footer ───────────────────────────────────────────────────────────
        $p->text($sep2 . "\n");
        $p->setJustification(Printer::JUSTIFY_CENTER);

        $footer1 = $cfg['footer_line1'] ?? '¡Gracias por su compra!';
        $footer2 = $cfg['footer_line2'] ?? 'Vuelva pronto';

        if ($footer1) $p->text($footer1 . "\n");
        if ($footer2) $p->text($footer2 . "\n");

        $p->text($sep . "\n");

        // Feed and cut
        $p->feed(4);
        $p->cut();
    }

    private function printTotalRow(Printer $p, string $label, string $value, int $cols): void
    {
        // 58mm: narrower value column so labels don't wrap
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
     * Resize, dither and threshold a logo image for ESC/POS printing.
     * Returns path to a temporary 1-bit-style PNG, or null on failure.
     *
     * @param string $srcPath  Source image file (must have a known extension)
     * @param int    $maxWidth Max width in pixels (should be ≤ printable dots)
     * @param int    $maxHeight Max height in pixels (limits paper waste)
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

            // Scale to fit within maxWidth × maxHeight, never upscale
            $scale = min(1.0, $maxWidth / $origW, $maxHeight / $origH);
            // Width must be multiple of 8 (ESC/POS requirement)
            $newW  = (int) (ceil($origW * $scale / 8) * 8);
            $newH  = max(1, (int) round($origH * $scale));

            $dst   = imagecreatetruecolor($newW, $newH);
            $white = imagecolorallocate($dst, 255, 255, 255);
            $black = imagecolorallocate($dst, 0, 0, 0);

            // White background (handles transparency)
            imagefill($dst, 0, 0, $white);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            imagedestroy($src);

            // Convert to grayscale then boost contrast before thresholding
            imagefilter($dst, IMG_FILTER_GRAYSCALE);
            imagefilter($dst, IMG_FILTER_BRIGHTNESS, -20);
            imagefilter($dst, IMG_FILTER_CONTRAST, -70); // negative = more contrast in PHP

            // Explicit threshold: pixels darker than 160/255 → black, rest → white
            // This ensures the PNG is true 1-bit, avoiding escpos dither issues
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
