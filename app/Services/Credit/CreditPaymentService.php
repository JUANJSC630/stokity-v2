<?php

namespace App\Services\Credit;

use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreditPaymentService
{
    public function __construct(private CreditService $creditService) {}

    /**
     * Register a payment (abono) for a credit sale.
     *
     * @throws \RuntimeException
     */
    public function register(
        CreditSale $credit,
        float $amount,
        string $paymentMethod,
        User $user,
        ?string $notes = null,
    ): CreditPayment {
        if (! in_array($credit->status, [CreditSale::STATUS_ACTIVE, CreditSale::STATUS_OVERDUE])) {
            throw new \RuntimeException('Este crédito no está activo.');
        }

        if (bccomp((string) $amount, '0', 2) <= 0) {
            throw new \RuntimeException('El monto del abono debe ser mayor a cero.');
        }

        if (bccomp((string) $amount, (string) $credit->balance, 2) > 0) {
            throw new \RuntimeException(
                'El abono no puede ser mayor al saldo restante de $'.number_format($credit->balance, 0, ',', '.')
            );
        }

        return DB::transaction(function () use ($credit, $amount, $paymentMethod, $user, $notes) {
            // Create cash movement linked to active session (if exists)
            $session = CashSession::getOpenForUser($user->id, $credit->branch_id);
            $cashMovement = null;

            if ($session) {
                $cashMovement = CashMovement::create([
                    'session_id' => $session->id,
                    'user_id' => $user->id,
                    'type' => 'cash_in',
                    'amount' => $amount,
                    'concept' => "Abono crédito #{$credit->code}",
                    'notes' => $notes,
                    'reference_type' => 'credit_payment',
                    'reference_id' => null, // Will be updated after creating payment
                ]);
            }

            // Create the payment record
            $payment = CreditPayment::create([
                'credit_sale_id' => $credit->id,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'registered_by' => $user->id,
                'cash_movement_id' => $cashMovement?->id,
                'payment_date' => now(),
                'notes' => $notes,
            ]);

            // Back-link cash movement to payment
            if ($cashMovement) {
                $cashMovement->update(['reference_id' => $payment->id]);
            }

            // Update credit balances
            $credit->amount_paid = (float) bcadd((string) $credit->amount_paid, (string) $amount, 2);
            $credit->balance = (float) bcsub((string) $credit->total_amount, (string) $credit->amount_paid, 2);
            $credit->save();

            // Sync amount_paid to the linked Sale (immediate sale types)
            if ($credit->sale) {
                $credit->sale->update(['amount_paid' => $credit->amount_paid]);
            }

            // Check if credit is fully paid
            if (bccomp((string) $credit->balance, '0', 2) <= 0) {
                $credit->load('items');
                $strategy = $this->creditService->resolveStrategy($credit->type);
                $strategy->handleCompletion($credit, $user);
            }

            return $payment;
        });
    }
}
