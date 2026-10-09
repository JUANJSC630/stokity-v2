import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/product';
import { Minus, Plus, Trash2 } from 'lucide-react';

export interface CartLineItem {
    product: Product;
    quantity: number;
    subtotal: number;
}

interface CartLineProps {
    item: CartLineItem;
    onDecrease: () => void;
    onIncrease: () => void;
    /** The raw number typed in the quantity box. */
    onTypeQuantity: (value: number) => void;
    onRemove: () => void;
}

const STEP =
    'flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card transition-colors hover:bg-muted active:bg-muted disabled:opacity-40 md:size-9';

/** One line of the cart: name and unit price, quantity controls, subtotal and a remove button (no swipe: a stray swipe must not drop a sale item). */
export function CartLine({ item, onDecrease, onIncrease, onTypeQuantity, onRemove }: CartLineProps) {
    const { product } = item;
    const isService = product.type === 'servicio';

    return (
        <li className="flex flex-col gap-2 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[15px] leading-snug font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(product.sale_price)} c/u</p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Eliminar ${product.name} del carrito`}
                    className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 md:size-9 dark:hover:bg-red-950/30"
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                </button>
            </div>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={onDecrease} aria-label={`Disminuir cantidad de ${product.name}`} className={STEP}>
                        <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={isService ? undefined : product.stock}
                        value={item.quantity}
                        onChange={(event) => {
                            const value = parseInt(event.target.value, 10);
                            if (!isNaN(value) && value >= 1) onTypeQuantity(value);
                        }}
                        onFocus={(event) => event.target.select()}
                        aria-label={`Cantidad de ${product.name}`}
                        className="h-11 w-14 rounded-lg border border-border/60 bg-background text-center text-base font-semibold tabular-nums focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none md:h-9 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                        type="button"
                        onClick={onIncrease}
                        disabled={!isService && item.quantity >= product.stock}
                        aria-label={`Aumentar cantidad de ${product.name}`}
                        className={STEP}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                    </button>
                </div>
                <span className="text-lg font-bold tabular-nums">{formatCurrency(item.subtotal)}</span>
            </div>
        </li>
    );
}
