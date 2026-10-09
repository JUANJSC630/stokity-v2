import { Search, X } from 'lucide-react';
import type { FormEvent } from 'react';

interface SearchFieldProps {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
}

/** 44 px / 16 px search box with a clear button; submits on Enter. */
export function SearchField({ id, label, placeholder, value, onChange, onSubmit }: SearchFieldProps) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form onSubmit={submit} role="search" className="relative">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
                id={id}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-card pr-12 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    aria-label="Borrar búsqueda"
                    onClick={() => onChange('')}
                    className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground sm:size-9"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            )}
        </form>
    );
}
