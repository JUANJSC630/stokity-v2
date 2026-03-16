<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnProduct;
use App\Models\Product;
use App\Services\StockMovementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SaleReturnController extends Controller
{
    public function __construct(private StockMovementService $stockMovements) {}

    public function store(Request $request, $saleId)
    {
        $request->validate([
            'products'                => 'required|array',
            'products.*.product_id'   => 'required|exists:products,id',
            'products.*.quantity'     => 'required|integer|min:1',
            'reason'                  => 'nullable|string',
        ]);

        $sale = Sale::with('saleProducts')->findOrFail($saleId);
        $user = Auth::user();

        // Deduplication guard: reject if an identical return was submitted for this
        // sale in the last 30 seconds (protects against double-clicks / network retries).
        $incomingProductIds = collect($request->products)->pluck('product_id')->sort()->values()->toArray();

        $recentDuplicate = SaleReturn::where('sale_id', $sale->id)
            ->where('created_at', '>=', now()->subSeconds(30))
            ->with('products')
            ->get()
            ->first(function (SaleReturn $ret) use ($incomingProductIds, $request): bool {
                $existingIds = $ret->products->pluck('id')->sort()->values()->toArray();
                if ($existingIds !== $incomingProductIds) {
                    return false;
                }
                foreach ($request->products as $item) {
                    $existing = $ret->products->firstWhere('id', $item['product_id']);
                    if (!$existing || (int) $existing->pivot->quantity !== (int) $item['quantity']) {
                        return false;
                    }
                }
                return true;
            });

        if ($recentDuplicate !== null) {
            return back()->with('success', 'Devolución registrada correctamente.');
        }

        try {
            DB::transaction(function () use ($request, $sale, $user): void {
                $saleReturn = SaleReturn::create([
                    'sale_id' => $sale->id,
                    'user_id' => $user ? $user->id : null,
                    'reason'  => $request->reason,
                ]);

                foreach ($request->products as $item) {
                    $saleProduct = $sale->saleProducts->where('product_id', $item['product_id'])->first();
                    if (!$saleProduct) {
                        throw new \RuntimeException('Producto no pertenece a la venta.');
                    }

                    // Validate max returnable quantity (inside transaction to be consistent)
                    $totalReturned = SaleReturnProduct::whereIn('sale_return_id', $sale->saleReturns()->pluck('id'))
                        ->where('product_id', $item['product_id'])
                        ->sum('quantity');
                    $maxReturn = $saleProduct->quantity - $totalReturned;
                    if ($item['quantity'] > $maxReturn) {
                        throw new \RuntimeException('Cantidad a devolver supera la cantidad vendida.');
                    }

                    SaleReturnProduct::create([
                        'sale_return_id' => $saleReturn->id,
                        'product_id'     => $item['product_id'],
                        'quantity'       => $item['quantity'],
                    ]);

                    // Lock row to prevent concurrent stock corruption (same pattern as SaleController)
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if (!$product) {
                        throw new \RuntimeException('Producto no encontrado.');
                    }
                    $previousStock  = $product->stock;
                    $product->stock += $item['quantity'];
                    $product->save();

                    $this->stockMovements->record(
                        product: $product,
                        type: 'in',
                        quantity: $item['quantity'],
                        previousStock: $previousStock,
                        newStock: $product->stock,
                        branchId: $sale->branch_id,
                        userId: Auth::id(),
                        reference: $sale->code,
                        notes: "Devolución venta #{$sale->code}",
                    );
                }

                // Mark sale as cancelled when all products have been returned
                $allReturned = true;
                foreach ($sale->saleProducts as $sp) {
                    $returnedQty = SaleReturnProduct::whereIn('sale_return_id', $sale->saleReturns()->pluck('id'))
                        ->where('product_id', $sp->product_id)
                        ->sum('quantity');
                    if ($returnedQty < $sp->quantity) {
                        $allReturned = false;
                        break;
                    }
                }
                if ($allReturned) {
                    $sale->status = 'cancelled';
                    $sale->save();
                }
            });
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return back()->with('success', 'Devolución registrada correctamente.');
    }

    /**
     * Imprime el recibo de devolución en la impresora térmica usando ESC/POS
     * Cambia el conector según tu sistema y conexión:
     * - Linux USB: FilePrintConnector('/dev/usb/lp0')
     * - Windows: WindowsPrintConnector('NombreImpresora')
     * - Red/Ethernet: NetworkPrintConnector('IP', Puerto)
     */
    public function printReturnReceipt($id)
    {
        $saleReturn = SaleReturn::with(['sale', 'products'])->findOrFail($id);
        $sale = $saleReturn->sale;
        $products = $saleReturn->products;

        // Generar recibo en texto plano
        $receiptText = '';
        $receiptText .= "=== DEVOLUCIÓN ===\n";
        $receiptText .= "Venta: {$sale->code}\n";
        $receiptText .= "Fecha: " . $saleReturn->created_at->format('Y-m-d H:i') . "\n";
        $receiptText .= "----------------------\n";
        foreach ($products as $p) {
            $receiptText .= $p->name . "\n";
            $receiptText .= "  Cant: " . $p->pivot->quantity . "  Vlr: $" . number_format($p->price ?? 0, 0, ',', '.') . "\n";
        }
        $receiptText .= "----------------------\n";
        $receiptText .= "Motivo: " . ($saleReturn->reason ?: 'Sin motivo') . "\n";
        $receiptText .= "======================\n\n\n";

        // La impresión de devoluciones se maneja vía QZ Tray (PrintController::returnReceipt)
        return back()->with('success', 'Operación completada.');
    }
}
