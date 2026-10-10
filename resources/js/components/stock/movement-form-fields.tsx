import { INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import axios from 'axios';
import { Loader2, Minus, MoveRight, Package, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MOVEMENT_TYPES, stockAfter, typeStyle, type MovementType } from './stock-meta';

/** Five ways to move stock, as big buttons instead of a list, so the choice is one tap with the effect visible. */
export function MovementTypePicker({ value, onChange }: { value: MovementType; onChange: (type: MovementType) => void }) {
    return (
        <div role="group" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
            {MOVEMENT_TYPES.map((type) => {
                const style = typeStyle(type);
                const Icon = style.icon;
                const active = value === type;

                return (
                    <button
                        key={type}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(type)}
                        className={cn(
                            'flex min-h-14 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-medium transition-colors',
                            active
                                ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                        )}
                    >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        {style.longLabel}
                    </button>
                );
            })}
        </div>
    );
}

interface QuantityFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    min: number;
    hint?: string;
    error?: string;
}

/** A whole number with big − / + buttons; it stays empty until the user types or taps, so nothing is submitted by default. */
export function QuantityField({ id, label, value, onChange, min, hint, error }: QuantityFieldProps) {
    const current = Number(value) || 0;
    const step = (delta: number) => onChange(String(Math.max(min, current + delta)));

    return (
        <LabeledField id={id} label={label} required error={error}>
            <div className="flex items-stretch gap-2">
                <button
                    type="button"
                    aria-label="Menos cantidad"
                    onClick={() => step(-1)}
                    disabled={value !== '' && current <= min}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 sm:size-9"
                >
                    <Minus className="size-4" aria-hidden="true" />
                </button>
                <input
                    id={id}
                    type="number"
                    min={min}
                    step="1"
                    inputMode="numeric"
                    autoComplete="off"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0"
                    className={cn(INPUT_CLASS, 'text-center font-semibold tabular-nums')}
                />
                <button
                    type="button"
                    aria-label="Más cantidad"
                    onClick={() => step(1)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 hover:bg-muted sm:size-9"
                >
                    <Plus className="size-4" aria-hidden="true" />
                </button>
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </LabeledField>
    );
}

const stockPill = (stock: number) =>
    stock <= 0
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';

interface ProductPickerProps {
    selected: Product | null;
    onSelect: (product: Product) => void;
    onClear: () => void;
    error?: string;
}

/** Find a product by name or code (searched on the server as the user types) and show it once chosen. */
export function ProductPicker({ selected, onSelect, onClear, error }: ProductPickerProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get('/api/products/search', { params: { q: value.trim() } });
                setResults(res.data);
                setShowDropdown(true);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);
    };

    const choose = (product: Product) => {
        onSelect(product);
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    const clear = () => {
        onClear();
        setQuery('');
        setResults([]);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <LabeledField id="product-search" label="Producto" required error={error} className="sm:col-span-2">
            <div ref={boxRef} className="relative">
                {selected ? (
                    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                        <Package className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-sm">
                            <span className="block truncate font-medium">{selected.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
                        </span>
                        <span className={cn('shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums', stockPill(selected.stock ?? 0))}>
                            Stock: {(selected.stock ?? 0).toLocaleString()}
                        </span>
                        <button
                            type="button"
                            onClick={clear}
                            title="Cambiar producto"
                            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:size-9"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            id="product-search"
                            ref={inputRef}
                            placeholder="Buscar por nombre o código..."
                            className={cn(INPUT_CLASS, 'pr-9 pl-9')}
                            value={query}
                            onChange={(event) => handleChange(event.target.value)}
                            onFocus={() => results.length > 0 && setShowDropdown(true)}
                            autoComplete="off"
                        />
                        {searching && (
                            <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                    </div>
                )}

                {showDropdown && results.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
                        <ul className="max-h-72 overflow-y-auto py-1">
                            {results.map((product) => (
                                <li key={product.id}>
                                    <button
                                        type="button"
                                        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                                        onClick={() => choose(product)}
                                    >
                                        <span className="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground">{product.code}</span>
                                        <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                                        <span
                                            className={cn(
                                                'shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
                                                stockPill(product.stock ?? 0),
                                            )}
                                        >
                                            {(product.stock ?? 0).toLocaleString()}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {showDropdown && !searching && query.length > 0 && results.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover px-3 py-4 text-center text-sm text-muted-foreground shadow-lg">
                        Sin resultados para "{query}"
                    </div>
                )}
            </div>
        </LabeledField>
    );
}

/** Before-and-after of the stock, using the same rule the server applies, so the user sees what the movement will do. */
export function StockPreview({ type, current, quantity }: { type: MovementType; current: number; quantity: string }) {
    if (quantity === '' || Number.isNaN(Number(quantity))) {
        return null;
    }
    const next = stockAfter(type, current, Number(quantity));
    const change = next - current;

    return (
        <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
            <div>
                <p className="text-xs text-muted-foreground">Stock después del movimiento</p>
                <p className="mt-0.5 flex items-center gap-2 text-lg font-bold tabular-nums">
                    <span className="text-muted-foreground">{current.toLocaleString()}</span>
                    <MoveRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>{next.toLocaleString()}</span>
                </p>
            </div>
            <span
                className={cn(
                    'rounded-md px-2 py-1 text-sm font-semibold tabular-nums',
                    change > 0 ? 'text-emerald-600 dark:text-emerald-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                )}
            >
                {change > 0 ? `+${change.toLocaleString()}` : change < 0 ? `−${Math.abs(change).toLocaleString()}` : '0'}
            </span>
        </div>
    );
}
