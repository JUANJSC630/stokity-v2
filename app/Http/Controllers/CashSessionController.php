<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CashSessionController extends Controller
{
    // Payment method code groupings
    private const CASH_CODES     = ['cash', 'efectivo'];
    private const CARD_CODES     = ['credit_card', 'debit_card', 'tarjeta_credito', 'tarjeta_debito'];
    private const TRANSFER_CODES = ['nequi', 'daviplata', 'addi', 'transfer', 'transferencia', 'pse', 'bancolombia'];

    /**
     * GET /cash-sessions/current — JSON for POS
     */
    public function currentSession()
    {
        $user     = Auth::user();
        $settings = BusinessSetting::getSettings();

        $session = $user->branch_id
            ? CashSession::getOpenForUser($user->id, $user->branch_id)
            : null;

        return response()->json([
            'session'            => $session ? $session->load(['branch:id,name', 'openedBy:id,name']) : null,
            'requireCashSession' => (bool) $settings->require_cash_session,
        ]);
    }

    /**
     * GET /cash-sessions — History list
     */
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = CashSession::with(['branch:id,name', 'openedBy:id,name', 'closedBy:id,name'])
            ->latest('opened_at');

        if (!$user->isAdmin()) {
            $query->where('opened_by_user_id', $user->id)
                  ->where('branch_id', $user->branch_id);
        }

        if ($request->filled('branch_id') && $user->isAdmin()) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('opened_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('opened_at', '<=', $request->date_to);
        }

        $sessions = $query->paginate(20)->withQueryString();

        $availableBranches = $user->isAdmin()
            ? \App\Models\Branch::where('status', true)->get(['id', 'name'])
            : [];

        return Inertia::render('cash-sessions/index', [
            'sessions'          => $sessions,
            'filters'           => $request->only(['date_from', 'date_to', 'branch_id']),
            'availableBranches' => $availableBranches,
            'isAdmin'           => $user->isAdmin(),
        ]);
    }

    /**
     * POST /cash-sessions — Open a new session (apertura)
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user->branch_id) {
            return back()->withErrors(['branch' => 'Tu usuario no tiene sucursal asignada.']);
        }

        $validated = $request->validate([
            'opening_amount' => 'required|numeric|min:0',
            'opening_notes'  => 'nullable|string|max:500',
        ]);

        try {
            DB::transaction(function () use ($user, $validated) {
                // Lock para serializar apertura — evita dos sesiones abiertas simultáneas
                $existing = CashSession::where('opened_by_user_id', $user->id)
                    ->where('branch_id', $user->branch_id)
                    ->where('status', 'open')
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    throw new \RuntimeException('Ya tienes una sesión de caja abierta.');
                }

                CashSession::create([
                    'branch_id'           => $user->branch_id,
                    'opened_by_user_id'   => $user->id,
                    'status'              => 'open',
                    'opening_amount'      => $validated['opening_amount'],
                    'opening_notes'       => $validated['opening_notes'] ?? null,
                    'opened_at'           => now()->setTimezone('America/Bogota'),
                ]);
            });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['session' => $e->getMessage()]);
        }

        return redirect()->route('pos.index')->with('success', 'Caja abierta correctamente.');
    }

    /**
     * GET /cash-sessions/{session} — Arqueo / reporte de sesión
     */
    public function show(CashSession $session)
    {
        $user = Auth::user();

        if (!$user->isAdmin() && $session->opened_by_user_id !== $user->id) {
            abort(403, 'No tienes acceso a esta sesión.');
        }

        $session->load(['branch:id,name', 'openedBy:id,name', 'closedBy:id,name']);

        $movements = $session->movements()->with('user:id,name')->orderBy('created_at')->get();

        // Build sales detail by payment method
        $paymentMethodNames = PaymentMethod::pluck('name', 'code');
        $salesDetail = $this->buildSalesDetail($session->id, $paymentMethodNames->toArray());

        return Inertia::render('cash-sessions/show', [
            'session'     => $session,
            'movements'   => $movements,
            'salesDetail' => $salesDetail,
        ]);
    }

    /**
     * GET /cash-sessions/{session}/close — Cierre form
     */
    public function closeForm(CashSession $session)
    {
        $user = Auth::user();

        if ($session->status !== 'open') {
            return redirect()->route('cash-sessions.show', $session)->withErrors(['session' => 'Esta sesión ya fue cerrada.']);
        }

        if (!$user->isAdmin() && !$user->isManager() && $session->opened_by_user_id !== $user->id) {
            abort(403, 'No tienes acceso a esta sesión.');
        }

        $session->load(['branch:id,name', 'openedBy:id,name']);
        $movements  = $session->movements()->with('user:id,name')->orderBy('created_at')->get();
        $paymentMethodNames = PaymentMethod::pluck('name', 'code');
        $salesSummary = $this->buildSalesDetail($session->id, $paymentMethodNames->toArray());
        $totalSales   = collect($salesSummary)->sum('total');

        // Expected cash (for non-blind display) — includes refunds
        $totalCash      = collect($salesSummary)->where('group', 'cash')->sum('total');
        $totalCashIn    = $movements->where('type', 'cash_in')->sum('amount');
        $totalCashOut   = $movements->where('type', 'cash_out')->sum('amount');
        $totalRefunds   = $this->calculateCashRefunds($session->id);
        $expectedCash   = (float) $session->opening_amount + $totalCash + $totalCashIn - $totalCashOut - $totalRefunds;

        return Inertia::render('cash-sessions/close', [
            'session'      => $session,
            'movements'    => $movements,
            'salesSummary' => $salesSummary,
            'totalSales'   => $totalSales,
            'expectedCash' => $user->isSeller() ? null : $expectedCash,
            'isBlind'      => $user->isSeller(),
        ]);
    }

    /**
     * POST /cash-sessions/{session}/close — Process cierre
     */
    public function close(Request $request, CashSession $session)
    {
        $user = Auth::user();

        if ($session->status !== 'open') {
            return back()->withErrors(['session' => 'Esta sesión ya fue cerrada.']);
        }

        if (!$user->isAdmin() && !$user->isManager() && $session->opened_by_user_id !== $user->id) {
            abort(403, 'No tienes acceso a esta sesión.');
        }

        $validated = $request->validate([
            'closing_amount_declared' => 'required|numeric|min:0',
            'closing_notes'           => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($session, $user, $validated) {
            // Lock session to prevent concurrent close and ensure consistent totals
            $session = CashSession::lockForUpdate()->findOrFail($session->id);

            if ($session->status !== 'open') {
                throw new \RuntimeException('Esta sesión ya fue cerrada.');
            }

            // Aggregate sales by payment method group
            $salesByMethod = Sale::where('session_id', $session->id)
                ->where('status', 'completed')
                ->selectRaw('payment_method, SUM(total) as total, COUNT(*) as count')
                ->groupBy('payment_method')
                ->get()
                ->keyBy('payment_method');

            $totalSalesCash     = 0;
            $totalSalesCard     = 0;
            $totalSalesTransfer = 0;
            $totalSalesOther    = 0;

            foreach ($salesByMethod as $method => $row) {
                $t = (float) $row->total;
                if (in_array($method, self::CASH_CODES)) {
                    $totalSalesCash += $t;
                } elseif (in_array($method, self::CARD_CODES)) {
                    $totalSalesCard += $t;
                } elseif (in_array($method, self::TRANSFER_CODES)) {
                    $totalSalesTransfer += $t;
                } else {
                    $totalSalesOther += $t;
                }
            }

            // Cash movements
            $movements    = CashMovement::where('session_id', $session->id)->get();
            $totalCashIn  = (float) $movements->where('type', 'cash_in')->sum('amount');
            $totalCashOut = (float) $movements->where('type', 'cash_out')->sum('amount');

            // Cash refunds: calculate actual refunded amount from return product quantities × sale prices
            $totalRefundsCash = $this->calculateCashRefunds($session->id);

            $expectedCash = (float) $session->opening_amount
                + $totalSalesCash
                + $totalCashIn
                - $totalCashOut
                - $totalRefundsCash;

            $discrepancy = (float) $validated['closing_amount_declared'] - $expectedCash;

            $session->update([
                'closed_by_user_id'       => $user->id,
                'status'                  => 'closed',
                'closed_at'               => now()->setTimezone('America/Bogota'),
                'closing_amount_declared' => $validated['closing_amount_declared'],
                'closing_notes'           => $validated['closing_notes'] ?? null,
                'total_sales_cash'        => $totalSalesCash,
                'total_sales_card'        => $totalSalesCard,
                'total_sales_transfer'    => $totalSalesTransfer,
                'total_sales_other'       => $totalSalesOther,
                'total_cash_in'           => $totalCashIn,
                'total_cash_out'          => $totalCashOut,
                'total_refunds_cash'      => $totalRefundsCash,
                'expected_cash'           => $expectedCash,
                'discrepancy'             => $discrepancy,
            ]);
        });

        return redirect()->route('cash-sessions.show', $session)->with('success', 'Caja cerrada correctamente.');
    }

    /**
     * POST /cash-sessions/{session}/movements — Add manual cash movement
     */
    public function addMovement(Request $request, CashSession $session)
    {
        $user = Auth::user();

        if (!$user->isAdmin() && $session->opened_by_user_id !== $user->id) {
            abort(403, 'No tienes acceso a esta sesión.');
        }

        $validated = $request->validate([
            'type'    => 'required|in:cash_in,cash_out',
            'amount'  => 'required|numeric|min:1',
            'concept' => 'required|string|max:255',
            'notes'   => 'nullable|string|max:500',
        ]);

        try {
            DB::transaction(function () use ($session, $user, $validated) {
                // Re-verify session is still open inside lock to prevent adding movements to a closed session
                $session = CashSession::lockForUpdate()->findOrFail($session->id);

                if ($session->status !== 'open') {
                    throw new \RuntimeException('La sesión ya está cerrada.');
                }

                CashMovement::create([
                    'session_id' => $session->id,
                    'user_id'    => $user->id,
                    ...$validated,
                ]);
            });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['session' => $e->getMessage()]);
        }

        $label = $validated['type'] === 'cash_in' ? 'Ingreso registrado.' : 'Retiro registrado.';

        return back()->with('success', $label);
    }

    /**
     * Calculate actual cash refunded for a session based on returned product quantities × sale prices.
     *
     * Example: Sale of $100,000 (3 products). Partial return of 1 product worth $20,000.
     * Before fix: returned $100,000 (full sale.total). After fix: returns $20,000 (actual amount).
     */
    private function calculateCashRefunds(int $sessionId): float
    {
        $returns = SaleReturn::whereHas('sale', function ($q) use ($sessionId) {
            $q->where('session_id', $sessionId)
              ->whereIn('payment_method', self::CASH_CODES);
        })->with(['sale.saleProducts'])->get();

        if ($returns->isEmpty()) {
            return 0;
        }

        $total = 0;
        foreach ($returns as $return) {
            $returnProducts = SaleReturnProduct::where('sale_return_id', $return->id)->get();
            foreach ($returnProducts as $rp) {
                $saleProduct = $return->sale->saleProducts->firstWhere('product_id', $rp->product_id);
                if ($saleProduct) {
                    $total += $rp->quantity * $saleProduct->price;
                }
            }
        }

        return round($total, 2);
    }

    /**
     * Build sales detail array grouped by payment method for a session.
     */
    private function buildSalesDetail(int $sessionId, array $paymentMethodNames = []): array
    {
        $rows = Sale::where('session_id', $sessionId)
            ->where('status', 'completed')
            ->selectRaw('payment_method, SUM(total) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get();

        return $rows->map(function ($row) use ($paymentMethodNames) {
            $method = (string) data_get($row, 'payment_method', '');
            if (in_array($method, self::CASH_CODES)) {
                $group = 'cash';
            } elseif (in_array($method, self::CARD_CODES)) {
                $group = 'card';
            } elseif (in_array($method, self::TRANSFER_CODES)) {
                $group = 'transfer';
            } else {
                $group = 'other';
            }

            return [
                'method' => $method,
                'name'   => $paymentMethodNames[$method] ?? ucfirst($method),
                'group'  => $group,
                'count'  => (int) data_get($row, 'count', 0),
                'total'  => (float) data_get($row, 'total', 0),
            ];
        })->toArray();
    }
}
