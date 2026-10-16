import { INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ProductTag } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface ProductTagsPageProps {
    tags: ProductTag[];
    maxPerProduct: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Catálogo', href: '/products' },
    { title: 'Etiquetas', href: '/product-tags' },
];

export default function ProductTags({ tags, maxPerProduct }: ProductTagsPageProps) {
    const onBrand = useOnBrandColor();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ProductTag | null>(null);
    const [deleting, setDeleting] = useState<ProductTag | null>(null);
    const form = useForm({ name: '' });

    const openCreate = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        setFormOpen(true);
    };

    const openEdit = (tag: ProductTag) => {
        setEditing(tag);
        form.setData('name', tag.name);
        form.clearErrors();
        setFormOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                form.reset();
            },
        };

        if (editing) {
            form.put(`/product-tags/${editing.id}`, options);
        } else {
            form.post('/product-tags', options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) return;
        router.delete(`/product-tags/${deleting.id}`, { preserveScroll: true, onSuccess: () => setDeleting(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Etiquetas" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Etiquetas</h1>
                        <p className="text-sm text-muted-foreground">
                            Marcas como «Artesanal» que se muestran en la tienda web. Cada producto puede tener hasta {maxPerProduct}. Para etiquetar
                            varios productos a la vez, selecciónalos en el catálogo.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nueva etiqueta
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {tags.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Tag className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">Aún no hay etiquetas</p>
                            <p className="text-sm text-muted-foreground">Crea la primera, por ejemplo «Artesanal».</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/40">
                            {tags.map((tag) => (
                                <li key={tag.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{tag.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {tag.products_count ?? 0} {tag.products_count === 1 ? 'producto' : 'productos'} ·{' '}
                                            <span className="font-mono">{tag.slug}</span>
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        aria-label={`Renombrar ${tag.name}`}
                                        className="size-11 sm:size-9"
                                        onClick={() => openEdit(tag)}
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        aria-label={`Eliminar ${tag.name}`}
                                        className="size-11 text-destructive hover:text-destructive sm:size-9"
                                        onClick={() => setDeleting(tag)}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Dialog open={formOpen} onOpenChange={setFormOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Renombrar etiqueta' : 'Nueva etiqueta'}</DialogTitle>
                            <DialogDescription>
                                {editing
                                    ? 'El identificador que usa la tienda web no cambia al renombrarla.'
                                    : 'Máximo 40 caracteres. El nombre es lo que verá el cliente.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="flex flex-col gap-4">
                            <LabeledField id="tag-name" label="Nombre" error={form.errors.name}>
                                <input
                                    id="tag-name"
                                    placeholder="Ej: Artesanal"
                                    maxLength={40}
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    className={INPUT_CLASS}
                                    autoFocus
                                    required
                                />
                            </LabeledField>
                            <DialogFooter className="gap-2 sm:gap-2">
                                <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setFormOpen(false)}>
                                    Cancelar
                                </Button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                                    style={{ color: onBrand.hex }}
                                >
                                    {editing ? 'Guardar cambios' : 'Crear etiqueta'}
                                </button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-red-500" aria-hidden="true" />
                                ¿Eliminar etiqueta?
                            </DialogTitle>
                            <DialogDescription>
                                {deleting && (
                                    <>
                                        Se quitará «{deleting.name}» de {deleting.products_count ?? 0}{' '}
                                        {deleting.products_count === 1 ? 'producto' : 'productos'}. Los productos no se borran.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setDeleting(null)}>
                                Cancelar
                            </Button>
                            <Button type="button" variant="destructive" className="h-11 sm:h-10" onClick={confirmDelete}>
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
