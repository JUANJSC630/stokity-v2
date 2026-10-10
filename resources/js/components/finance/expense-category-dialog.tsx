import { INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { type ExpenseCategory } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { COLOR_OPTIONS } from './expense-colors';

/** Create or edit an expense category: a name and one color out of the palette. */
export function ExpenseCategoryDialog({ open, onClose, category }: { open: boolean; onClose: () => void; category?: ExpenseCategory }) {
    const onBrand = useOnBrandColor();
    const isEdit = Boolean(category);
    const errors = (usePage().props as unknown as { errors?: Record<string, string> }).errors ?? {};

    const { data, setData, post, put, processing, reset } = useForm({
        name: category?.name ?? '',
        color: category?.color ?? 'blue',
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && category) {
            put(`/expense-categories/${category.id}`, {
                onSuccess: () => {
                    toast.success('Categoría actualizada.');
                    handleClose();
                },
                preserveScroll: true,
            });
        } else {
            post('/expense-categories', {
                onSuccess: () => {
                    toast.success('Categoría creada.');
                    handleClose();
                },
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField id="category-name" label="Nombre" error={errors.name}>
                        <input
                            id="category-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej: Publicidad"
                            autoFocus
                            className={INPUT_CLASS}
                        />
                    </LabeledField>

                    <div className="space-y-2">
                        <p className="text-xs font-medium">Color</p>
                        <div className="grid grid-cols-6 gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    title={c.label}
                                    aria-label={c.label}
                                    aria-pressed={data.color === c.value}
                                    onClick={() => setData('color', c.value)}
                                    className={cn(
                                        'flex size-11 items-center justify-center rounded-full border-2 transition-transform sm:size-9',
                                        data.color === c.value ? 'scale-110 border-foreground' : 'border-transparent',
                                    )}
                                    style={{ backgroundColor: c.hex }}
                                >
                                    {data.color === c.value && <Check className="size-4 text-white" aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Seleccionado: <strong>{COLOR_OPTIONS.find((c) => c.value === data.color)?.label ?? '—'}</strong>
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing} className="h-11 sm:h-10">
                            Cancelar
                        </Button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            {processing ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
