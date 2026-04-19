<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnProduct;
use App\Services\StockMovementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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

        // Verify user belongs to the sale's branch (prevent cross-branch returns)
        if (! $user->isAdmin() && $user->branch_id && $sale->branch_id !== $user->branch_id) {
            abort(403, 'No tienes acceso a ventas de otra sucursal.');
        }

        // Validate sale status before processing return
        if (! in_array($sale->status, ['completed', 'cancelled'])) {
            return back()->withErrors(['sale' => 'Solo se pueden devolver ventas completadas.']);
        }

        try {
            DB::transaction(function () use ($request, $sale, $user): void {
                // Lock the sale to serialize returns — prevents double stock replenishment
                $sale = Sale::with('saleProducts')->lockForUpdate()->findOrFail($sale->id);

                // Deduplication guard inside the lock — reject identical returns within 30s
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
                            if (! $existing || (int) $existing->pivot->quantity !== (int) $item['quantity']) {
                                return false;
                            }
                        }

                        return true;
                    });

                if ($recentDuplicate !== null) {
                    return; // Silently skip — already processed
                }

                $saleReturn = SaleReturn::create([
                    'sale_id' => $sale->id,
                    'user_id' => $user ? $user->id : null,
                    'reason' => $request->reason,
                ]);

                $saleSubtotal = $sale->saleProducts->sum('subtotal');
                $discountFactor = ($saleSubtotal > 0 && $sale->discount_amount > 0)
                    ? min($sale->discount_amount / $saleSubtotal, 1.0)
                    : 0;

                foreach ($request->products as $item) {
                    $saleProduct = $sale->saleProducts->where('product_id', $item['product_id'])->first();
                    if (! $saleProduct) {
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
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'effective_price' => round($saleProduct->price * (1 - $discountFactor), 2),
                    ]);

                    // Lock row to prevent concurrent stock corruption (same pattern as SaleController)
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if (! $product) {
                        throw new \RuntimeException('Producto no encontrado.');
                    }

                    if (! $product->isService()) {
                        $previousStock = $product->stock;
                        $product->stock += $item['quantity'];
                        $product->save();

                        $this->stockMovements->record(
                            product: $product,
                            type: 'ingreso',
                            quantity: $item['quantity'],
                            previousStock: $previousStock,
                            newStock: $product->stock,
                            branchId: $sale->branch_id,
                            userId: Auth::id(),
                            reference: $sale->code,
                            notes: "Devolución venta #{$sale->code}",
                        );
                    }
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
}
