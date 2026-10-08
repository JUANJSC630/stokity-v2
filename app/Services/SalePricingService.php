<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Server-side source of truth for what a sale line costs.
 *
 * The browser sends price, subtotal and net, but none of them can be trusted:
 * a seller could post `price: 1`. Lines are priced from the catalog; only
 * variable-price services may take a price from the request, and only for
 * users holding `pos.sell_variable_price`.
 */
class SalePricingService
{
    private const PRICE_TOLERANCE = 0.01;

    private const FUTURE_DATE_TOLERANCE_MINUTES = 5;

    /**
     * @param  list<array{id: int|string, quantity: int|string, price: float|int|string}>  $lines
     * @param  array<int, float>  $acceptedPrices  product id => price already saved on the quote being edited
     * @param  string  $errorKeyTemplate  sprintf template of the error key, receives the line index
     * @return array{lines: list<array{id: int, quantity: int, price: float, subtotal: float}>, net: float, errors: array<string, string>}
     */
    public function priceLines(User $user, array $lines, array $acceptedPrices = [], string $errorKeyTemplate = 'products.%d.price'): array
    {
        $products = Product::query()->whereIn('id', collect($lines)->pluck('id'))->get()->keyBy('id');
        $priced = [];
        $errors = [];
        $net = 0.0;

        foreach ($lines as $index => $line) {
            $product = $products->get((int) $line['id']);
            $quantity = (int) $line['quantity'];
            $errorKey = sprintf($errorKeyTemplate, $index);

            if (! $product) {
                $errors[$errorKey] = "Producto ID {$line['id']} no encontrado.";

                continue;
            }

            $price = $this->resolvePrice($user, $product, round((float) $line['price'], 2), $acceptedPrices[$product->id] ?? null, $error);

            if ($error !== null) {
                $errors[$errorKey] = $error;

                continue;
            }

            $subtotal = round($price * $quantity, 2);
            $net += $subtotal;
            $priced[] = ['id' => $product->id, 'quantity' => $quantity, 'price' => $price, 'subtotal' => $subtotal];
        }

        return ['lines' => $priced, 'net' => round($net, 2), 'errors' => $errors];
    }

    /**
     * @return array<string, string>
     */
    public function discountErrors(User $user, string $type, float $value, ?Sale $existing = null): array
    {
        if ($type === 'none' || $value <= 0) {
            return [];
        }

        $errors = [];

        if ($type === 'percentage' && $value > 100) {
            $errors['discount_value'] = 'El descuento no puede ser mayor al 100%.';
        }

        $isUnchangedQuoteDiscount = $existing
            && $existing->discount_type === $type
            && round((float) $existing->discount_value, 2) === round($value, 2);

        if (! $isUnchangedQuoteDiscount && ! $user->can('pos.apply_discount')) {
            $errors['discount_type'] = 'No tienes permiso para aplicar descuentos.';
        }

        return $errors;
    }

    /**
     * Sales cannot be dated in the future, and only users who can edit sales
     * may register them on another day.
     */
    public function dateError(User $user, string $date): ?string
    {
        $saleDate = Carbon::parse($date, 'America/Bogota');
        $now = now('America/Bogota');

        if ($saleDate->greaterThan($now->copy()->addMinutes(self::FUTURE_DATE_TOLERANCE_MINUTES))) {
            return 'La fecha de la venta no puede ser futura.';
        }

        if (! $saleDate->isSameDay($now) && ! $user->can('sales.update')) {
            return 'Solo puedes registrar ventas con la fecha de hoy.';
        }

        return null;
    }

    /**
     * @param  list<array{id: int, quantity: int, price: float, subtotal: float}>  $pricedLines
     */
    public function totalTax(array $pricedLines): float
    {
        $taxRates = Product::query()->whereIn('id', collect($pricedLines)->pluck('id'))->pluck('tax', 'id');

        return (float) collect($pricedLines)->sum(fn ($line) => $line['subtotal'] * (($taxRates[$line['id']] ?? 0) / 100));
    }

    /**
     * @param  array<string, string>  $errors
     *
     * @throws ValidationException
     */
    public function throwIfAny(array $errors): void
    {
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function resolvePrice(User $user, Product $product, float $requested, ?float $acceptedPrice, ?string &$error): float
    {
        $error = null;

        if ($product->isService() && $product->variable_price) {
            if (! $user->can('pos.sell_variable_price')) {
                $error = "No tienes permiso para fijar el precio de {$product->name}.";
            }

            return $requested;
        }

        $catalogPrice = round((float) $product->sale_price, 2);

        if (abs($requested - $catalogPrice) < self::PRICE_TOLERANCE) {
            return $catalogPrice;
        }

        if ($acceptedPrice !== null && abs($requested - $acceptedPrice) < self::PRICE_TOLERANCE) {
            return round($acceptedPrice, 2);
        }

        $error = "El precio de {$product->name} es ".number_format($catalogPrice, 0, ',', '.').'. Actualiza el carrito.';

        return $requested;
    }
}
