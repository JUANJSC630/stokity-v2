import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    templates: ExpenseTemplate[];
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    currentDay: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Gastos', href: '/expenses' },
    { title: 'Gastos fijos recurrentes', href: '/expense-templates' },
];

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

// ─── TemplateModal ─────────────────────────────────────────────────────────────

interface TemplateModalProps {
    open: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    template?: ExpenseTemplate;
}

function TemplateModal({ open, onClose, categories, branches, userBranchId, template }: TemplateModalProps) {
    const isEdit = Boolean(template);
    const isAdmin = branches.length > 0;

    const { data, setData, post, put, processing, reset, errors } = useForm({
        name: template?.name ?? '',
        expense_category_id: template?.expense_category_id ? String(template.expense_category_id) : '',
        reference_amount: template?.reference_amount ?? 0,
        due_day: template?.due_day ? String(template.due_day) : '',
        branch_id: template?.branch_id ? String(template.branch_id) : userBranchId ? String(userBranchId) : '',
        is_active: template?.is_active ?? true,
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && template) {
            put(`/expense-templates/${template.id}`, {
                onSuccess: handleClose,
                preserveScroll: true,
            });
        } else {
            post('/expense-templates', {
                onSuccess: handleClose,
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label>Nombre</Label>
                        <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ej: Arriendo local" />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label>Categoría</Label>
                        <Select value={data.expense_category_id} onValueChange={(v) => setData('expense_category_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin categoría</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color ?? '#94a3b8' }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.expense_category_id && <p className="text-xs text-red-600">{errors.expense_category_id}</p>}
                    </div>

                    {/* Reference amount */}
                    <div className="space-y-1.5">
                        <Label>Monto de referencia</Label>
                        <CurrencyInput value={data.reference_amount} onChange={(v) => setData('reference_amount', v)} placeholder="0" />
                        {errors.reference_amount && <p className="text-xs text-red-600">{errors.reference_amount}</p>}
                    </div>

                    {/* Due day */}
                    <div className="space-y-1.5">
                        <Label>Día de vencimiento (opcional)</Label>
                        <Select value={data.due_day} onValueChange={(v) => setData('due_day', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sin día específico" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin día específico</SelectItem>
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                                    <SelectItem key={d} value={String(d)}>
                                        Día {d} de cada mes
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Indica cuándo vence este gasto para saber si está al día o atrasado.
                        </p>
                        {errors.due_day && <p className="text-xs text-red-600">{errors.due_day}</p>}
                    </div>

                    {/* Branch — admin only */}
                    {isAdmin && (
                        <div className="space-y-1.5">
                            <Label>Sucursal</Label>
                            <Select value={data.branch_id} onValueChange={(v) => setData('branch_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id}</p>}
                        </div>
                    )}

                    {/* Active toggle (edit only) */}
                    {isEdit && (
                        <div className="flex items-center gap-3">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={Boolean(data.is_active)}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="is_active">Activa</Label>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear gasto fijo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

// ─── QuickRegisterModal ────────────────────────────────────────────────────────

interface QuickRegisterModalProps {
    template: ExpenseTemplate | null;
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    onClose: () => void;
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function QuickRegisterModal({ template, branches, userBranchId, onClose }: QuickRegisterModalProps) {
    const isAdmin = branches.length > 0;

    const { data, setData, post, processing, reset, errors } = useForm({
        expense_category_id: template?.expense_category_id ? String(template.expense_category_id) : '',
        description: template?.name ?? '',
        amount: template?.reference_amount ?? 0,
        expense_date: todayStr(),
        branch_id: template?.branch_id ? String(template.branch_id) : userBranchId ? String(userBranchId) : '',
        notes: '',
        expense_template_id: template?.id ? String(template.id) : '',
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/expenses', {
            onSuccess: () => {
                toast.success('Gasto registrado correctamente.');
                handleClose();
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={Boolean(template)} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Registrar pago</DialogTitle>
                    <p className="text-sm text-muted-foreground">{template?.name}</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Monto</Label>
                        <CurrencyInput value={data.amount} onChange={(v) => setData('amount', v)} />
                        {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Fecha de pago</Label>
                        <Input type="date" value={data.expense_date} onChange={(e) => setData('expense_date', e.target.value)} />
                        {errors.expense_date && <p className="text-xs text-red-600">{errors.expense_date}</p>}
                    </div>

                    {isAdmin && (
                        <div className="space-y-1.5">
                            <Label>Sucursal</Label>
                            <Select value={data.branch_id} onValueChange={(v) => setData('branch_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Registrando...' : 'Registrar pago'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── DueStatusBadge ────────────────────────────────────────────────────────────

function DueStatusBadge({ status }: { status: ExpenseTemplate['due_status'] }) {
    switch (status) {
        case 'registered':
            return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Registrado</Badge>;
        case 'overdue':
            return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Vencido</Badge>;
        case 'due_soon':
            return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Vence pronto</Badge>;
        case 'inactive':
            return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Pausada</Badge>;
        default:
            return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pendiente</Badge>;
    }
}

export default function ExpenseTemplates({ templates, categories, branches, userBranchId }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTemplate, setEditTemplate] = useState<ExpenseTemplate | null>(null);
    const [registerTemplate, setRegisterTemplate] = useState<ExpenseTemplate | null>(null);

    const handleDelete = (id: number) => {
        if (!window.confirm('¿Eliminar este gasto fijo? Esta acción no se puede deshacer.')) return;
        router.delete(`/expense-templates/${id}`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gastos fijos recurrentes" />

            <TemplateModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                categories={categories}
                branches={branches}
                userBranchId={userBranchId}
            />

            {editTemplate && (
                <TemplateModal
                    open={Boolean(editTemplate)}
                    onClose={() => setEditTemplate(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    template={editTemplate}
                />
            )}

            <QuickRegisterModal
                key={registerTemplate?.id ?? 'none'}
                template={registerTemplate}
                branches={branches}
                userBranchId={userBranchId}
                onClose={() => setRegisterTemplate(null)}
            />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">Gastos fijos recurrentes</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Configura los gastos que se repiten cada mes para registrarlos fácilmente
                        </p>
                    </div>
                    <Button onClick={() => setShowCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo gasto fijo
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Mis gastos fijos ({templates.length})</CardTitle>
                        <CardDescription>Cada gasto fijo activo aparecerá para registro rápido al inicio de cada mes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {templates.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-base font-medium">Sin gastos fijos configurados</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Agrega los gastos que pagas cada mes, como arriendo, servicios o suscripciones
                                </p>
                                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar primer gasto fijo
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200 text-left text-xs font-medium text-muted-foreground dark:border-neutral-700">
                                                <th className="pr-4 pb-2">Nombre</th>
                                                <th className="pr-4 pb-2">Categoría</th>
                                                <th className="pr-4 pb-2 text-right">Monto referencia</th>
                                                <th className="pr-4 pb-2">Vencimiento</th>
                                                <th className="pr-4 pb-2">Estado</th>
                                                <th className="pb-2">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {templates.map((t) => (
                                                <tr key={t.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                                                    <td className="py-2 pr-4 font-medium">{t.name}</td>
                                                    <td className="py-2 pr-4">
                                                        {t.category ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span
                                                                    className="inline-block h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: t.category.color ?? '#94a3b8' }}
                                                                />
                                                                {t.category.name}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4 text-right">{cop(t.reference_amount)}</td>
                                                    <td className="py-2 pr-4 text-sm">
                                                        {t.due_day ? (
                                                            <span>Día {t.due_day}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        <DueStatusBadge status={t.due_status} />
                                                    </td>
                                                    <td className="py-2">
                                                        <div className="flex items-center gap-1">
                                                            {t.due_status !== 'registered' && t.due_status !== 'inactive' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-green-600 hover:text-green-700"
                                                                    onClick={() => setRegisterTemplate(t)}
                                                                    title="Registrar pago"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => setEditTemplate(t)}
                                                                title="Editar"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                                                onClick={() => handleDelete(t.id)}
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <div className="block space-y-3 md:hidden">
                                    {templates.map((t) => (
                                        <div
                                            key={t.id}
                                            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                        >
                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">{t.name}</p>
                                                    {t.category && (
                                                        <div className="mt-0.5 flex items-center gap-1.5">
                                                            <span
                                                                className="inline-block h-2 w-2 rounded-full"
                                                                style={{ backgroundColor: t.category.color ?? '#94a3b8' }}
                                                            />
                                                            <span className="text-xs text-muted-foreground">{t.category.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-bold">{cop(t.reference_amount)}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <DueStatusBadge status={t.due_status} />
                                                    {t.due_day && (
                                                        <span className="text-xs text-muted-foreground">Día {t.due_day}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    {t.due_status !== 'registered' && t.due_status !== 'inactive' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700"
                                                            onClick={() => setRegisterTemplate(t)}
                                                            title="Registrar pago"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTemplate(t)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(t.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
