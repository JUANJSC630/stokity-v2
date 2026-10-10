import { StickyActions } from '@/components/admin/sticky-actions';
import { FormPanel, INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Loader2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Categorías', href: '/categories' },
    { title: 'Crear', href: '/categories/create' },
];

export default function CreateCategory() {
    const onBrand = useOnBrandColor();
    const form = useForm({
        name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/categories', {
            onSuccess: () => {
                form.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Categoría" />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/categories"
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Crear Categoría</h1>
                        <p className="text-sm text-muted-foreground">Las categorías ordenan tu catálogo de productos.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <FormPanel title="Categoría">
                        <LabeledField id="name" label="Nombre" error={form.errors.name} className="sm:col-span-2">
                            <input
                                id="name"
                                placeholder="Nombre de la categoría"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className={INPUT_CLASS}
                                autoFocus
                            />
                        </LabeledField>
                    </FormPanel>

                    <StickyActions>
                        <Link href="/categories">
                            <Button type="button" variant="outline" className="h-11 sm:h-10">
                                Cancelar
                            </Button>
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            {form.processing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            Crear Categoría
                        </button>
                    </StickyActions>
                </form>
            </div>
        </AppLayout>
    );
}
