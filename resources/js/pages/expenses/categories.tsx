import { DeleteWithReasonDialog } from '@/components/common/DeleteWithReasonDialog';
import { ExpenseCategoryDialog } from '@/components/finance/expense-category-dialog';
import { colorHex } from '@/components/finance/expense-colors';
import { Section } from '@/components/sales/form-fields';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExpenseCategory } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    categories: ExpenseCategory[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Gastos', href: '/expenses' },
    { title: 'Categorías', href: '/expense-categories' },
];

function Dot({ color }: { color: string | null }) {
    return <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: colorHex(color) }} />;
}

export default function ExpenseCategoriesIndex({ categories }: Props) {
    const onBrand = useOnBrandColor();
    const [showCreate, setShowCreate] = useState(false);
    const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = (reason: string) => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/expense-categories/${deleteTarget.id}`, {
            data: { deletion_reason: reason },
            preserveScroll: true,
            onSuccess: () => toast.success('Categoría eliminada.'),
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const systemCategories = categories.filter((c) => c.is_system);
    const customCategories = categories.filter((c) => !c.is_system);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías de gastos" />

            <DeleteWithReasonDialog
                open={Boolean(deleteTarget)}
                title="Eliminar categoría"
                description={
                    deleteTarget && (
                        <span>
                            ¿Eliminar la categoría <strong>{deleteTarget.name}</strong>? Los gastos asociados quedarán sin categoría.
                        </span>
                    )
                }
                confirmLabel="Eliminar"
                processing={deleting}
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />

            <ExpenseCategoryDialog open={showCreate} onClose={() => setShowCreate(false)} />

            {editCategory && <ExpenseCategoryDialog open={Boolean(editCategory)} onClose={() => setEditCategory(null)} category={editCategory} />}

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Categorías de gastos</h1>
                        <p className="text-sm text-muted-foreground">Organiza tus gastos con categorías personalizadas</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nueva categoría
                    </button>
                </div>

                <Section
                    title={`Categorías personalizadas (${customCategories.length})`}
                    description="Creadas por ti. Puedes editarlas o eliminarlas."
                >
                    {customCategories.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-5 pb-8 text-center">
                            <p className="text-sm text-muted-foreground">No hay categorías personalizadas aún.</p>
                            <button
                                type="button"
                                onClick={() => setShowCreate(true)}
                                className="flex h-11 items-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-medium hover:bg-muted sm:h-9"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Crear la primera
                            </button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/40 border-t border-border/60">
                            {customCategories.map((cat) => (
                                <li key={cat.id} className="flex items-center justify-between gap-3 px-5 py-2">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Dot color={cat.color} />
                                        <span className="truncate text-sm font-medium">{cat.name}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            aria-label="Editar"
                                            title="Editar"
                                            onClick={() => setEditCategory(cat)}
                                            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:size-9"
                                        >
                                            <Pencil className="size-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Eliminar"
                                            title="Eliminar"
                                            onClick={() => setDeleteTarget(cat)}
                                            className="flex size-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 sm:size-9 dark:hover:bg-red-950/40"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section
                    title={`Categorías del sistema (${systemCategories.length})`}
                    description="Predefinidas por el sistema. No se pueden modificar ni eliminar."
                >
                    <ul className="divide-y divide-border/40 border-t border-border/60">
                        {systemCategories.map((cat) => (
                            <li key={cat.id} className="flex items-center gap-3 px-5 py-3.5">
                                <Dot color={cat.color} />
                                <span className="text-sm text-muted-foreground">{cat.name}</span>
                                <Lock className="ml-auto size-3.5 text-muted-foreground/50" aria-hidden="true" />
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>
        </AppLayout>
    );
}
