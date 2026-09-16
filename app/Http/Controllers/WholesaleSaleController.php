<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\WholesaleSale;
use App\Services\WholesaleSaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WholesaleSaleController extends Controller
{
    public function __construct(private WholesaleSaleService $service) {}

    /**
     * GET /wholesale — list wholesale orders (own module, separate from Ventas).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = WholesaleSale::with(['client', 'seller:id,name', 'branch:id,name']);

        if ($user->isRestrictedToOwnBranch() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $wholesaleSales = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('wholesale/index', [
            'wholesaleSales' => $wholesaleSales,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * GET /wholesale/create
     */
    public function create()
    {
        $user = Auth::user();

        return Inertia::render('wholesale/create', [
            'clients' => Client::orderBy('name')->get(['id', 'name', 'document', 'is_wholesale', 'wholesale_discount_pct']),
            'branches' => $user->isRestrictedToOwnBranch() && $user->branch_id
                ? Branch::where('id', $user->branch_id)->get(['id', 'name'])
                : Branch::orderBy('name')->get(['id', 'name']),
            'branchId' => $user->branch_id,
        ]);
    }

    /**
     * POST /wholesale
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $validated = $this->validateData($request);

        abort_if($user->isRestrictedToOwnBranch() && (int) $validated['branch_id'] !== $user->branch_id, 403);

        $wholesaleSale = $this->service->create($validated, $validated['items'], $user);

        return redirect()->route('wholesale.show', $wholesaleSale)
            ->with('success', 'Pedido mayorista registrado exitosamente.');
    }

    /**
     * GET /wholesale/{wholesaleSale}
     */
    public function show(WholesaleSale $wholesaleSale)
    {
        $user = Auth::user();
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        $wholesaleSale->load(['client', 'seller:id,name', 'branch:id,name', 'items', 'sale:id,code']);

        return Inertia::render('wholesale/show', [
            'wholesaleSale' => $wholesaleSale,
            'canUpdate' => $user->can('wholesale.update'),
            'canDelete' => $user->can('wholesale.delete'),
        ]);
    }

    /**
     * GET /wholesale/{wholesaleSale}/edit
     */
    public function edit(WholesaleSale $wholesaleSale)
    {
        $user = Auth::user();
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        if ($wholesaleSale->status === WholesaleSale::STATUS_CANCELLED) {
            return redirect()->route('wholesale.show', $wholesaleSale)
                ->withErrors(['status' => 'No se puede editar un pedido cancelado.']);
        }

        $wholesaleSale->load('items');

        return Inertia::render('wholesale/edit', [
            'wholesaleSale' => $wholesaleSale,
            'clients' => Client::orderBy('name')->get(['id', 'name', 'document', 'is_wholesale', 'wholesale_discount_pct']),
            'branches' => $user->isRestrictedToOwnBranch() && $user->branch_id
                ? Branch::where('id', $user->branch_id)->get(['id', 'name'])
                : Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * PUT /wholesale/{wholesaleSale}
     */
    public function update(Request $request, WholesaleSale $wholesaleSale)
    {
        $user = Auth::user();
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        $validated = $this->validateData($request);

        try {
            $this->service->update($wholesaleSale, $validated, $validated['items']);

            return redirect()->route('wholesale.show', $wholesaleSale)
                ->with('success', 'Pedido mayorista actualizado exitosamente.');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    /**
     * POST /wholesale/{wholesaleSale}/cancel — marks the order as cancelled.
     * Stays visible in the list (with a "Cancelado" badge) and stops counting
     * in Dashboard/Finance. A second step (destroy) is needed to archive it.
     */
    public function cancel(WholesaleSale $wholesaleSale)
    {
        $user = Auth::user();
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        try {
            $this->service->cancel($wholesaleSale);

            return back()->with('success', 'Pedido mayorista cancelado.');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    /**
     * DELETE /wholesale/{wholesaleSale} — archives (soft-deletes) an
     * already-cancelled order so it stops taking up space in the list.
     * Recoverable from the "Pedidos eliminados" trash view.
     */
    public function destroy(WholesaleSale $wholesaleSale)
    {
        $user = Auth::user();
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        try {
            $this->service->delete($wholesaleSale);

            return redirect()->route('wholesale.index')
                ->with('success', 'Pedido mayorista eliminado.');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    /**
     * GET /wholesale/deleted — trash view (admin only).
     */
    public function deletedIndex(Request $request)
    {
        $user = Auth::user();
        $query = WholesaleSale::onlyTrashed()->with(['client', 'seller:id,name', 'branch:id,name']);

        if ($user->isRestrictedToOwnBranch() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        $wholesaleSales = $query->orderBy('deleted_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('wholesale/deleted', [
            'wholesaleSales' => $wholesaleSales,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * GET /wholesale/deleted/{id} — read-only detail of an archived order.
     */
    public function deletedShow($id)
    {
        $user = Auth::user();
        $wholesaleSale = WholesaleSale::onlyTrashed()
            ->with(['client', 'seller:id,name', 'branch:id,name', 'items', 'sale:id,code'])
            ->findOrFail($id);
        abort_if($user->isRestrictedToOwnBranch() && $wholesaleSale->branch_id !== $user->branch_id, 403);

        return Inertia::render('wholesale/show', [
            'wholesaleSale' => $wholesaleSale,
            'canUpdate' => false,
            'canDelete' => false,
            'deleted' => true,
        ]);
    }

    private function validateData(Request $request): array
    {
        $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();

        return $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'client_id' => 'required|exists:clients,id',
            'payment_method' => 'required|string|in:'.implode(',', $activePaymentMethods),
            'date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'estimated_cost' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ], [
            'payment_method.in' => 'El método de pago seleccionado no es válido.',
        ]);
    }
}
