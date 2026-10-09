import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/** 44 px / 16 px on phones so iOS does not zoom; compact from `sm`. */
export const SELECT_TRIGGER = 'h-11 w-full bg-white text-base text-black sm:h-9 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100';

export const INPUT_CLASS =
    'h-11 w-full rounded-lg border border-border/60 bg-white px-3 text-base text-black focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none disabled:opacity-60 sm:h-9 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100';

export function FormPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card">
            <header className="px-5 pt-4 pb-3">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </header>
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">{children}</div>
        </section>
    );
}

export function LabeledField({
    id,
    label,
    required,
    error,
    className,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={id} className="text-xs font-medium">
                {label}
                {required && (
                    <span aria-hidden="true" className="text-red-500">
                        {' '}
                        *
                    </span>
                )}
            </label>
            {children}
            {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}

interface Option {
    id: number | string;
    name: string;
}

export function OptionSelect({
    id,
    value,
    onValueChange,
    options,
    placeholder,
}: {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    options: Option[];
    placeholder: string;
}) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger id={id} className={SELECT_TRIGGER}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
