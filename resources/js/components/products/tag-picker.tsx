import { cn } from '@/lib/utils';
import { type ProductTag } from '@/types';
import { Link } from '@inertiajs/react';

interface TagPickerProps {
    tags: ProductTag[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    max: number;
    error?: string;
    canManage?: boolean;
}

/** Tick the tags that describe a product; the storefront shows them next to it. */
export function TagPicker({ tags, selectedIds, onChange, max, error, canManage = false }: TagPickerProps) {
    const atLimit = selectedIds.length >= max;

    const toggle = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((selected) => selected !== id));
        } else if (!atLimit) {
            onChange([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-2 sm:col-span-2">
            {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Aún no hay etiquetas.{' '}
                    {canManage && (
                        <Link href="/product-tags" className="underline">
                            Crea la primera
                        </Link>
                    )}
                </p>
            ) : (
                <div role="group" aria-label="Etiquetas del producto" className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                        const selected = selectedIds.includes(tag.id);

                        return (
                            <button
                                key={tag.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={!selected && atLimit}
                                onClick={() => toggle(tag.id)}
                                className={cn(
                                    'inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50 sm:h-9',
                                    selected
                                        ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {tag.name}
                            </button>
                        );
                    })}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                {selectedIds.length} de {max} etiquetas
                {canManage && tags.length > 0 && (
                    <>
                        {' · '}
                        <Link href="/product-tags" className="underline">
                            Administrar etiquetas
                        </Link>
                    </>
                )}
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
