import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';
import { ImageOff, Keyboard, Plus, Search, ShoppingCart, X } from 'lucide-react';
import type { RefObject } from 'react';

interface Category {
    id: number;
    name: string;
}

interface ProductSearchPanelProps {
    query: string;
    onQueryChange: (value: string) => void;
    searching: boolean;
    searchRef: RefObject<HTMLInputElement | null>;
    categories: Category[];
    selectedCategory: string;
    selectedType: 'servicio' | '';
    onSelectAll: () => void;
    onSelectServices: () => void;
    onSelectCategory: (id: string) => void;
    results: Product[];
    onAdd: (product: Product) => void;
    /** Nothing in the cart yet: the empty state invites to search. */
    cartIsEmpty: boolean;
    showShortcuts: boolean;
    onShowShortcuts: (show: boolean) => void;
}

const CHIP = 'flex h-10 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors sm:h-8 sm:px-3';
const CHIP_ON = 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]';
const CHIP_OFF = 'border-border/60 bg-card text-muted-foreground hover:bg-muted';

const SHORTCUTS: [string, string][] = [
    ['Buscar producto', '/'],
    ['Agregar primer resultado', 'Enter'],
    ['Limpiar búsqueda', 'Esc'],
    ['Cobrar venta', 'F9'],
    ['Ver/ocultar atajos', '?'],
];

const formatPrice = (value: number): string => formatCurrency(value);

/** Left side of the POS: search box, category chips, keyboard hints and the list of matching products. */
export function ProductSearchPanel({
    query,
    onQueryChange,
    searching,
    searchRef,
    categories,
    selectedCategory,
    selectedType,
    onSelectAll,
    onSelectServices,
    onSelectCategory,
    results,
    onAdd,
    cartIsEmpty,
    showShortcuts,
    onShowShortcuts,
}: ProductSearchPanelProps) {
    const onBrand = useOnBrandColor();
    const hasFilter = selectedType !== '' || selectedCategory !== '';
    const trimmed = query.trim();

    return (
        <>
            <div className="border-b border-border/60 p-3">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        ref={searchRef}
                        type="search"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        aria-label="Buscar producto"
                        placeholder="Buscar producto por nombre o código... ( / )"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        className="h-12 w-full rounded-xl border border-border/60 bg-card pr-24 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none md:h-11 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {searching && <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--brand-primary)]">Buscando...</span>}
                    {!searching && query && (
                        <button
                            type="button"
                            aria-label="Borrar búsqueda"
                            onClick={() => onQueryChange('')}
                            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {categories.length > 0 && (
                    <div className="-mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            aria-pressed={selectedCategory === '' && selectedType === ''}
                            onClick={onSelectAll}
                            className={cn(CHIP, selectedCategory === '' && selectedType === '' ? CHIP_ON : CHIP_OFF)}
                        >
                            Todas
                        </button>
                        <button
                            type="button"
                            aria-pressed={selectedType === 'servicio'}
                            onClick={onSelectServices}
                            className={cn(CHIP, selectedType === 'servicio' ? CHIP_ON : CHIP_OFF)}
                        >
                            Servicios
                        </button>
                        {categories
                            .filter((category) => !/^servicios?$/i.test(category.name.trim()))
                            .map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    aria-pressed={selectedCategory === String(category.id)}
                                    onClick={() => onSelectCategory(String(category.id))}
                                    className={cn(CHIP, selectedCategory === String(category.id) ? CHIP_ON : CHIP_OFF)}
                                >
                                    {category.name}
                                </button>
                            ))}
                    </div>
                )}

                <div className="mt-2 hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
                    <span className="flex items-center gap-1">
                        <Keyboard className="size-3" aria-hidden="true" />
                        <kbd className="rounded border px-1">/</kbd> buscar
                    </span>
                    <span>
                        <kbd className="rounded border px-1">Enter</kbd> agregar
                    </span>
                    <span>
                        <kbd className="rounded border px-1">Esc</kbd> limpiar
                    </span>
                    <span>
                        <kbd className="rounded border px-1">F9</kbd> cobrar
                    </span>
                    <button
                        type="button"
                        onClick={() => onShowShortcuts(true)}
                        className="ml-auto flex size-6 items-center justify-center rounded border border-border text-[10px] font-bold text-muted-foreground hover:bg-muted"
                        title="Ver todos los atajos (?)"
                    >
                        ?
                    </button>
                </div>

                {showShortcuts && (
                    <div className="mt-2 rounded-xl border border-border bg-popover p-3 shadow-lg">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Atajos de teclado</h3>
                            <button
                                type="button"
                                aria-label="Cerrar atajos"
                                onClick={() => onShowShortcuts(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                            {SHORTCUTS.map(([label, key]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{label}</span>
                                    <kbd className="rounded border px-1.5 font-mono">{key}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {results.length === 0 && !searching && (selectedType !== '' || trimmed.length >= 2) && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron productos</p>
                )}
                {trimmed.length < 2 && !hasFilter && cartIsEmpty && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ShoppingCart className="size-12 opacity-20" aria-hidden="true" />
                        <p className="text-sm">Escribe para buscar productos</p>
                    </div>
                )}
                <div className="divide-y divide-border/50">
                    {results.map((product, index) => {
                        const isService = product.type === 'servicio';
                        const outOfStock = !isService && product.stock <= 0;
                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => onAdd(product)}
                                disabled={outOfStock}
                                aria-label={`Agregar ${product.name} al carrito, ${formatPrice(product.sale_price)}`}
                                className={cn(
                                    'flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-50',
                                    index === 0 && 'bg-[var(--brand-primary-soft)]/60',
                                )}
                            >
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt=""
                                        className="size-12 shrink-0 rounded-xl border border-border/60 object-cover"
                                    />
                                ) : (
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
                                        {product.name ? product.name.charAt(0).toUpperCase() : <ImageOff className="size-5" aria-hidden="true" />}
                                    </span>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-medium">{product.name}</span>
                                    <span className="block truncate font-mono text-xs text-muted-foreground">{product.code}</span>
                                </span>
                                <span className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="text-base font-bold tabular-nums">
                                        {isService && product.variable_price ? 'A cotizar' : formatPrice(product.sale_price)}
                                    </span>
                                    {isService ? (
                                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                            Servicio
                                        </span>
                                    ) : (
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                product.stock > 0
                                                    ? 'bg-muted text-muted-foreground'
                                                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                                            )}
                                        >
                                            Stock: {product.stock}
                                        </span>
                                    )}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                                        outOfStock ? 'bg-muted text-muted-foreground' : 'bg-[var(--brand-primary)]',
                                    )}
                                    style={outOfStock ? undefined : { color: onBrand.hex }}
                                >
                                    <Plus className="size-5" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
