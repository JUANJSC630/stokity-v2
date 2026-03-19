import { cn } from '@/lib/utils';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

const FORMATTER = new Intl.NumberFormat('es-CO');

/** Parse raw string to integer (strips any non-digit character including dots). */
function parse(str: string): number {
    const cleaned = str.replace(/\D/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
}

/** Format a positive integer with Colombian thousands separator (e.g. 123000 → "123.000"). */
function format(value: number): string {
    return value > 0 ? FORMATTER.format(value) : '';
}

export interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
    /** Numeric or string numeric value (0 or '' shows placeholder). */
    value?: number | string | null;
    /** Called with the parsed integer on every change. */
    onChange?: (value: number) => void;
}

/**
 * Monetary input for Colombian Pesos (COP).
 * - Renders as `type="text" inputMode="numeric"` — no browser spin arrows.
 * - Formats with thousands separator while typing: 123000 → 123.000
 * - Selects all text on focus for easy replacement.
 * - Syncs from parent when props change (fully controlled).
 * - Visually identical to shadcn's <Input />.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onChange, className, onFocus, onBlur, placeholder = '0', ...props }, ref) => {
        const toNumeric = (v: number | string | null | undefined): number => {
            if (v === '' || v === null || v === undefined) return 0;
            return typeof v === 'string' ? parse(v) : Math.round(v);
        };

        const numeric = toNumeric(value);
        const isFocused = useRef(false);
        const [display, setDisplay] = useState(() => format(numeric));

        // Sync formatted display when parent updates value (while not editing)
        useEffect(() => {
            if (!isFocused.current) {
                setDisplay(format(toNumeric(value)));
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [numeric]);

        const handleChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const num = parse(e.target.value);
                setDisplay(format(num));
                onChange?.(num);
            },
            [onChange],
        );

        const handleFocus = useCallback(
            (e: React.FocusEvent<HTMLInputElement>) => {
                isFocused.current = true;
                // Show raw digits while editing so cursor behaves naturally
                setDisplay(numeric > 0 ? String(numeric) : '');
                // Select all so user can quickly replace the full amount
                requestAnimationFrame(() => e.target.select());
                onFocus?.(e);
            },
            [onFocus, numeric],
        );

        const handleBlur = useCallback(
            (e: React.FocusEvent<HTMLInputElement>) => {
                isFocused.current = false;
                // Re-format on blur using the current parent value
                setDisplay(format(toNumeric(value)));
                onBlur?.(e);
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [onBlur, numeric],
        );

        return (
            <input
                {...props}
                ref={ref}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={display}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={cn(
                    // Identical styles to shadcn <Input />
                    'border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-gray-200 dark:border-gray-700',
                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                    className,
                )}
            />
        );
    },
);

CurrencyInput.displayName = 'CurrencyInput';
