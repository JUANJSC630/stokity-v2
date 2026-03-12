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
      'products' => 'required|array',
      'products.*.product_id' => 'required|exists:products,id',
      'products.*.quantity' => 'required|integer|min:1',
      'reason' => 'nullable|string',
    ]);

    $sale = Sale::with('saleProducts')->findOrFail($saleId);
    $user = Auth::user();

    DB::beginTransaction();
    try {
      $saleReturn = SaleReturn::create([
        'sale_id' => $sale->id,
        'user_id' => $user ? $user->id : null,
        'reason' => $request->reason,
      ]);

      foreach ($request->products as $item) {
        $saleProduct = $sale->saleProducts->where('product_id', $item['product_id'])->first();
        if (!$saleProduct) {
          throw new \Exception('Producto no pertenece a la venta.');
        }
        // Validar que no se devuelva más de lo vendido
        // Sumar todas las devoluciones previas para este producto en esta venta
        $totalReturned = SaleReturnProduct::whereIn('sale_return_id', $sale->saleReturns()->pluck('id'))
          ->where('product_id', $item['product_id'])
          ->sum('quantity');
        $maxReturn = $saleProduct->quantity - $totalReturned;
        if ($item['quantity'] > $maxReturn) {
          throw new \Exception('Cantidad a devolver supera la cantidad vendida.');
        }
        // Registrar devolución
        SaleReturnProduct::create([
          'sale_return_id' => $saleReturn->id,
          'product_id' => $item['product_id'],
          'quantity' => $item['quantity'],
        ]);
        // Actualizar stock y registrar movimiento
        $product = Product::find($item['product_id']);
        $previousStock = $product->stock;
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
      // Verificar si todos los productos han sido devueltos
      $allReturned = true;
      foreach ($sale->saleProducts as $sp) {
        // Sumar todas las cantidades devueltas para este producto en todas las devoluciones de la venta
        // Incluyendo la devolución actual que acabamos de crear
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
      DB::commit();
      return back()->with('success', 'Devolución registrada correctamente.');
    } catch (\Exception $e) {
      DB::rollBack();
      return response()->json(['error' => $e->getMessage()], 422);
    }
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
