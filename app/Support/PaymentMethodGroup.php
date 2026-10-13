<?php

namespace App\Support;

/**
 * Groups the payment method codes a business can configure into the four
 * families every cash report speaks in: cash, card, transfer and everything else.
 */
class PaymentMethodGroup
{
    public const CASH = 'cash';

    public const CARD = 'card';

    public const TRANSFER = 'transfer';

    public const OTHER = 'other';

    /** @var list<string> */
    public const CASH_CODES = ['cash', 'efectivo'];

    /** @var list<string> */
    public const CARD_CODES = ['credit_card', 'debit_card', 'tarjeta_credito', 'tarjeta_debito'];

    /** @var list<string> */
    public const TRANSFER_CODES = ['nequi', 'daviplata', 'addi', 'transfer', 'transferencia', 'pse', 'bancolombia'];

    /**
     * @return 'cash'|'card'|'transfer'|'other'
     */
    public static function of(string $code): string
    {
        return match (true) {
            in_array($code, self::CASH_CODES, true) => self::CASH,
            in_array($code, self::CARD_CODES, true) => self::CARD,
            in_array($code, self::TRANSFER_CODES, true) => self::TRANSFER,
            default => self::OTHER,
        };
    }
}
