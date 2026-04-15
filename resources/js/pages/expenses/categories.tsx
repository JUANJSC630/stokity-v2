import { DeleteWithReasonDialog } from '@/components/common/DeleteWithReasonDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExpenseCategory } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
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

// ─── Color palette ─────────────────────────────────────────────────────────────

const COLOR_OPTIONS: { label: string; value: string; hex: string }[] = [
    { label: 'Azul',      value: 'blue',   hex: '#3b82f6' },
    { label: 'Morado',    value: 'purple', hex: '#a855f7' },
    { label: 'Amarillo',  value: 'yellow', hex: '#eab308' },
    { label: 'Cyan',      value: 'cyan',   hex: '#06b6d4' },
    { label: 'Rosa',      value: 'pink',   hex: '#ec4899' },
    { label: 'Naranja',   value: 'orange', hex: '#f97316' },
    { label: 'Gris',      value: 'gray',   hex: '#6b7280' },
    { label: 'Rojo',      value: 'red',    hex: '#ef4444' },
    { label: 'Verde',     value: 'green',  hex: '#22c55e' },
    { label: 'Índigo',    value: 'indigo', hex: '#6366f1' },
    { label: 'Pizarra',   value: 'slate',  hex: '#64748b' },
    { label: 'Lima',      value: 'lime',   hex: '#84cc16' },
];

function colorHex(color: string | null): string {
    return COLOR_OPTIONS.find((c) => c.value === color)?.hex ?? '#94a3b8';
}

// ─── CategoryModal ─────────────────────────────────────────────────────────────

interface CategoryModalProps {
    open: boolean;
    onClose: () => void;
    category?: ExpenseCategory;
}

function CategoryModal({ open, onClose, category }: CategoryModalProps) {
    const isEdit = Boolean(category);
    const { errors } = usePage().props as { errors: Record<string, string> };

    const { data, setData, post, put, processing, reset } = useForm({
        name:  category?.name  ?? '',
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
                    <div className="space-y-1.5">
                        <Label>Nombre</Label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej: Publicidad"
                            autoFocus
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    title={c.label}
                                    onClick={() => setData('color', c.value)}
                                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                                        data.color === c.value ? 'border-neutral-900 dark:border-white scale-110' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Seleccionado: <strong>{COLOR_OPTIONS.find((c) => c.value === data.color)?.label ?? '—'}</strong>
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ExpenseCategoriesIndex({ categories }: Props) {
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

    const systemCategories  = categories.filter((c) => c.is_system);
    const customCategories  = categories.filter((c) => !c.is_system);

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

            <CategoryModal open={showCreate} onClose={() => setShowCreate(false)} />

            {editCategory && (
                <CategoryModal
                    open={Boolean(editCategory)}
                    onClose={() => setEditCategory(null)}
                    category={editCategory}
                />
            )}

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">Categorías de gastos</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Organiza tus gastos con categorías personalizadas
                        </p>
                    </div>
                    <Button onClick={() => setShowCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva categoría
                    </Button>
                </div>

                {/* Custom categories */}
                <Card>
                    <CardHeader>
                        <CardTitle>Categorías personalizadas ({customCategories.length})</CardTitle>
                        <CardDescription>Creadas por ti. Puedes editarlas o eliminarlas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customCategories.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm text-muted-foreground">No hay categorías personalizadas aún.</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear la primera
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {customCategories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="h-3 w-3 flex-shrink-0 rounded-full"
                                                style={{ backgroundColor: colorHex(cat.color) }}
                                            />
                                            <span className="text-sm font-medium">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setEditCategory(cat)}
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                                onClick={() => setDeleteTarget(cat)}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* System categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            Categorías del sistema ({systemCategories.length})
                        </CardTitle>
                        <CardDescription>Predefinidas por el sistema. No se pueden modificar ni eliminar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {systemCategories.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3 py-3">
                                    <span
                                        className="h-3 w-3 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: colorHex(cat.color) }}
                                    />
                                    <span className="text-sm text-muted-foreground">{cat.name}</span>
                                    <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
