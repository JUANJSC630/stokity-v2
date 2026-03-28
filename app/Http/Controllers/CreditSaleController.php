<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Services\Credit\CreditPaymentService;
use App\Services\Credit\CreditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CreditSaleController extends Controller
{
    public function __construct(
        private CreditService $creditService,
        private CreditPaymentService $paymentService,
    ) {}

    /**
     * GET /credits — List credits with tabs
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = CreditSale::with(['client', 'seller:id,name', 'branch:id,name']);

        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        // Mark overdue credits on the fly
        CreditSale::where('status', CreditSale::STATUS_ACTIVE)
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->where('balance', '>', 0)
            ->update(['status' => CreditSale::STATUS_OVERDUE]);

        // Tab filter
        $tab = $request->input('tab', 'active');
        match ($tab) {
            'active' => $query->whereIn('status', [CreditSale::STATUS_ACTIVE, CreditSale::STATUS_OVERDUE]),
            'overdue' => $query->where('status', CreditSale::STATUS_OVERDUE),
            'completed' => $query->where('status', CreditSale::STATUS_COMPLETED),
            default => null, // 'all' — no filter
        };

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhereHas('client', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        $credits = $query->orderByRaw("FIELD(status, 'overdue', 'active', 'completed', 'cancelled')")
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Count for badges
        $overdueCount = CreditSale::query()
            ->when(!$user->isAdmin() && $user->branch_id, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->where('status', CreditSale::STATUS_OVERDUE)
            ->count();

        return Inertia::render('credits/index', [
            'credits' => $credits,
            'filters' => $request->only(['tab', 'search', 'type']),
            'overdueCount' => $overdueCount,
        ]);
    }

    /**
     * GET /credits/create — Creation wizard
     */
    public function create()
    {
        $user = Auth::user();

        $clients = Client::orderBy('name')->get();

        $products = Product::where('status', true)
            ->when(!$user->isAdmin() && $user->branch_id, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'sale_price' => $p->sale_price,
                'stock' => $p->stock,
                'reserved_stock' => $p->reserved_stock,
                'available_stock' => $p->availableStock(),
                'image_url' => $p->image_url,
                'type' => $p->type,
                'tax' => $p->tax,
                'variable_price' => $p->variable_price,
            ]);

        return Inertia::render('credits/create', [
            'clients' => $clients,
            'products' => $products,
            'branchId' => $user->branch_id,
        ]);
    }

    /**
     * POST /credits — Store new credit
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Validate cash session requirement
        $settings = BusinessSetting::getSettings();
        $openSession = CashSession::getOpenForUser($user->id, (int) ($request->branch_id ?? $user->branch_id));
        if (!$openSession && $settings->require_cash_session) {
            return back()->withErrors(['session' => 'Debes abrir la caja antes de registrar un crédito.']);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:layaway,installments,due_date,hold',
            'client_id' => 'required|exists:clients,id',
            'branch_id' => 'required|exists:branches,id',
            'due_date' => 'nullable|date|after_or_equal:today',
            'installments_count' => 'nullable|integer|min:2|max:60',
            'initial_payment' => 'nullable|numeric|min:0',
            'initial_payment_method' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
        ]);

        try {
            $credit = $this->creditService->create($validated, $validated['items'], $user);

            // Register initial payment if provided
            if (!empty($validated['initial_payment']) && $validated['initial_payment'] > 0) {
                $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();
                $method = $validated['initial_payment_method'] ?? 'efectivo';

                if (!in_array($method, $activePaymentMethods)) {
                    $method = $activePaymentMethods[0] ?? 'efectivo';
                }

                $this->paymentService->register(
                    credit: $credit,
                    amount: $validated['initial_payment'],
                    paymentMethod: $method,
                    user: $user,
                    notes: 'Abono inicial',
                );

                $credit->refresh();
            }

            return redirect()->route('credits.show', $credit)
                ->with('success', 'Crédito registrado exitosamente.');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['stock' => $e->getMessage()])->withInput();
        }
    }

    /**
     * GET /credits/{credit} — Detail view
     */
    public function show(CreditSale $credit)
    {
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $credit->branch_id !== $user->branch_id, 403);

        $credit->load([
            'client',
            'seller:id,name',
            'branch:id,name',
            'sale:id,code',
            'items.product:id,name,code,image',
            'payments' => fn ($q) => $q->orderBy('payment_date', 'desc'),
            'payments.registeredBy:id,name',
        ]);

        $paymentMethods = PaymentMethod::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('credits/show', [
            'credit' => $credit,
            'paymentMethods' => $paymentMethods,
            'canCancel' => $user->isAdmin() || $user->role === 'encargado',
        ]);
    }

    /**
     * POST /credits/{credit}/payments — Register a payment (abono)
     */
    public function addPayment(Request $request, CreditSale $credit)
    {
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $credit->branch_id !== $user->branch_id, 403);

        // Validate cash session requirement
        $settings = BusinessSetting::getSettings();
        $openSession = CashSession::getOpenForUser($user->id, $credit->branch_id);
        if (!$openSession && $settings->require_cash_session) {
            return back()->withErrors(['session' => 'Debes abrir la caja antes de registrar un abono.']);
        }

        $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|string|in:' . implode(',', $activePaymentMethods),
            'notes' => 'nullable|string|max:500',
        ], [
            'payment_method.in' => 'El método de pago seleccionado no es válido.',
        ]);

        try {
            $this->paymentService->register(
                credit: $credit,
                amount: $validated['amount'],
                paymentMethod: $validated['payment_method'],
                user: $user,
                notes: $validated['notes'] ?? null,
            );

            $credit->refresh();

            $message = $credit->status === CreditSale::STATUS_COMPLETED
                ? 'Abono registrado. El crédito ha sido completado.'
                : 'Abono registrado exitosamente.';

            return back()->with('success', $message);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }
    }

    /**
     * POST /credits/{credit}/cancel — Cancel a credit (admin/encargado only)
     */
    public function cancel(CreditSale $credit)
    {
        $user = Auth::user();

        if (!$user->isAdmin() && $user->role !== 'encargado') {
            abort(403, 'No tienes permisos para cancelar créditos.');
        }

        abort_if(!$user->isAdmin() && $credit->branch_id !== $user->branch_id, 403);

        try {
            $this->creditService->cancel($credit, $user);

            return redirect()->route('credits.index')
                ->with('success', 'Crédito cancelado exitosamente.');
        } catch (\RuntimeException $e) {
            return back()->withErrors(['cancel' => $e->getMessage()]);
        }
    }

    /**
     * GET /credits/receivables — JSON endpoint for Finanzas widget
     */
    public function receivables(Request $request)
    {
        $user = Auth::user();

        $query = CreditSale::whereIn('type', [CreditSale::TYPE_INSTALLMENTS, CreditSale::TYPE_DUE_DATE])
            ->whereIn('status', [CreditSale::STATUS_ACTIVE, CreditSale::STATUS_OVERDUE]);

        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $totalReceivables = (float) $query->sum('balance');

        $byBranch = (clone $query)
            ->selectRaw('branch_id, SUM(balance) as total')
            ->groupBy('branch_id')
            ->with('branch:id,name')
            ->get();

        return response()->json([
            'total' => $totalReceivables,
            'by_branch' => $byBranch,
        ]);
    }

    /**
     * GET /credits/overdue-count — JSON for sidebar badge
     */
    public function overdueCount()
    {
        $user = Auth::user();

        $count = CreditSale::whereIn('status', [CreditSale::STATUS_OVERDUE])
            ->when(!$user->isAdmin() && $user->branch_id, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->count();

        // Also count active credits past due_date that haven't been marked overdue yet
        $count += CreditSale::where('status', CreditSale::STATUS_ACTIVE)
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->where('balance', '>', 0)
            ->when(!$user->isAdmin() && $user->branch_id, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->count();

        return response()->json(['count' => $count]);
    }
}
