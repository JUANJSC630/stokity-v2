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
     * The credit row is re-read under a lock so concurrent requests holding a
     * stale model cannot overpay it, lose an update or complete it twice. The
     * given instance is synced with the persisted state before returning.
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
        if (bccomp((string) $amount, '0', 2) <= 0) {
            throw new \RuntimeException('El monto del abono debe ser mayor a cero.');
        }

        return DB::transaction(function () use ($credit, $amount, $paymentMethod, $user, $notes) {
            $locked = CreditSale::query()->lockForUpdate()->findOrFail($credit->id);

            if (! in_array($locked->status, [CreditSale::STATUS_ACTIVE, CreditSale::STATUS_OVERDUE])) {
                throw new \RuntimeException('Este crédito no está activo.');
            }

            if (bccomp((string) $amount, (string) $locked->balance, 2) > 0) {
                throw new \RuntimeException(
                    'El abono no puede ser mayor al saldo restante de $'.number_format($locked->balance, 0, ',', '.')
                );
            }

            $session = CashSession::getOpenForUser($user->id, $locked->branch_id);
            $cashMovement = null;

            if ($session) {
                $cashMovement = CashMovement::create([
                    'session_id' => $session->id,
                    'user_id' => $user->id,
                    'type' => 'cash_in',
                    'amount' => $amount,
                    'concept' => "Abono crédito #{$locked->code}",
                    'notes' => $notes,
                    'reference_type' => 'credit_payment',
                    'reference_id' => null,
                ]);
            }

            $payment = CreditPayment::create([
                'credit_sale_id' => $locked->id,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'registered_by' => $user->id,
                'cash_movement_id' => $cashMovement?->id,
                'payment_date' => now(),
                'notes' => $notes,
            ]);

            if ($cashMovement) {
                $cashMovement->update(['reference_id' => $payment->id]);
            }

            $locked->amount_paid = (float) bcadd((string) $locked->amount_paid, (string) $amount, 2);
            $locked->balance = (float) bcsub((string) $locked->total_amount, (string) $locked->amount_paid, 2);
            $locked->save();

            if ($locked->sale) {
                $locked->sale->update(['amount_paid' => $locked->amount_paid]);
            }

            if (bccomp((string) $locked->balance, '0', 2) <= 0) {
                $locked->load('items');
                $strategy = $this->creditService->resolveStrategy($locked->type);
                $strategy->handleCompletion($locked, $user);
            }

            $credit->setRawAttributes($locked->getAttributes(), true);

            return $payment;
        });
    }
}
