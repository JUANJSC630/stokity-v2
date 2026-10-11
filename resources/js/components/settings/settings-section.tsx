import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/** A card of a settings page: what it is for, then the fields or controls. */
export function SettingsSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border border-border/60 bg-card p-5 sm:p-6', className)}>
            <header className="mb-4">
                <h3 className="text-base font-semibold">{title}</h3>
                {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </header>
            {children}
        </section>
    );
}

/** The primary action of a settings form, with the "Guardado" note after it saves. */
export function SaveBar({ children, saved }: { children: ReactNode; saved?: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {children}
            {saved}
        </div>
    );
}

/** A submit button in the brand colour, 44 px on phones. */
export function BrandSubmit({ children, disabled, fullWidth }: { children: ReactNode; disabled?: boolean; fullWidth?: boolean }) {
    const onBrand = useOnBrandColor();

    return (
        <button
            type="submit"
            disabled={disabled}
            className={cn(
                'flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10',
                fullWidth ? 'w-full' : 'w-full sm:w-auto',
            )}
            style={{ color: onBrand.hex }}
        >
            {children}
        </button>
    );
}
