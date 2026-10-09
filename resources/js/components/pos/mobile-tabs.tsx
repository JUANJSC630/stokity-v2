import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Search, ShoppingCart } from 'lucide-react';

interface MobileTabsProps {
    active: 'search' | 'cart';
    onChange: (tab: 'search' | 'cart') => void;
    itemCount: number;
    total: number;
}

/**
 * Phone bar of the POS. Search and Cart stay as two views, but the cart tab always shows how many lines there are and
 * the running total, so the cashier never has to switch views just to see how much it adds up to.
 */
export function MobileTabs({ active, onChange, itemCount, total }: MobileTabsProps) {
    const onBrand = useOnBrandColor();
    const hasItems = itemCount > 0;
    const filled = hasItems && active === 'search';

    return (
        <div
            role="tablist"
            aria-label="Vista del punto de venta"
            className="flex shrink-0 gap-2 border-t border-border/60 bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        >
            <button
                type="button"
                role="tab"
                aria-selected={active === 'search'}
                onClick={() => onChange('search')}
                className={cn(
                    'flex h-14 w-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors',
                    active === 'search' ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]' : 'text-muted-foreground hover:bg-muted',
                )}
            >
                <Search className="size-5" aria-hidden="true" />
                Buscar
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={active === 'cart'}
                onClick={() => onChange('cart')}
                className={cn(
                    'flex h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors',
                    filled
                        ? 'bg-[var(--brand-primary)]'
                        : active === 'cart'
                          ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                          : 'text-muted-foreground hover:bg-muted',
                )}
                style={filled ? { color: onBrand.hex } : undefined}
            >
                <span className="relative">
                    <ShoppingCart className="size-5" aria-hidden="true" />
                    {hasItems && (
                        <span className="absolute -top-2 -right-3 flex min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] leading-4 font-bold text-foreground ring-1 ring-border">
                            {itemCount}
                        </span>
                    )}
                </span>
                <span className="truncate tabular-nums">
                    {hasItems ? `${active === 'cart' ? 'Carrito' : 'Ver carrito'} · ${formatCurrency(total)}` : 'Carrito'}
                </span>
            </button>
        </div>
    );
}
