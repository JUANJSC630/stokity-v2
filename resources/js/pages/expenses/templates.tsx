import { DeleteWithReasonDialog } from '@/components/common/DeleteWithReasonDialog';
import { ColorDot, DueStatusPill } from '@/components/finance/finance-parts';
import { ConfirmActionDialog, QuickRegisterDialog, TemplateFormDialog } from '@/components/finance/template-dialogs';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem, type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
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

const cop = (value: number): string => formatCurrency(Number(value));

const ICON = 'flex size-11 items-center justify-center rounded-lg hover:bg-muted sm:size-9';

export default function ExpenseTemplates({ templates, categories, branches, userBranchId }: Props) {
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [showCreate, setShowCreate] = useState(false);
    const [editTemplate, setEditTemplate] = useState<ExpenseTemplate | null>(null);
    const [registerTemplate, setRegisterTemplate] = useState<ExpenseTemplate | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ExpenseTemplate | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [unregisterTarget, setUnregisterTarget] = useState<ExpenseTemplate | null>(null);

    const confirmDelete = (reason: string) => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/expense-templates/${deleteTarget.id}`, {
            data: { deletion_reason: reason },
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const confirmUnregister = () => {
        if (!unregisterTarget) return;
        router.delete(`/expense-templates/${unregisterTarget.id}/unregister-month`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Pago des-registrado.');
                setUnregisterTarget(null);
            },
            onError: () => setUnregisterTarget(null),
        });
    };

    const actions = (t: ExpenseTemplate) => (
        <div className="flex items-center gap-1">
            {t.due_status === 'registered' ? (
                <button
                    type="button"
                    aria-label="Des-registrar pago de este mes"
                    title="Des-registrar pago de este mes"
                    onClick={() => setUnregisterTarget(t)}
                    className={`${ICON} text-amber-600`}
                >
                    <Undo2 className="size-4" aria-hidden="true" />
                </button>
            ) : (
                t.due_status !== 'inactive' && (
                    <button
                        type="button"
                        aria-label="Registrar pago"
                        title="Registrar pago"
                        onClick={() => setRegisterTemplate(t)}
                        className={`${ICON} text-green-600`}
                    >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                    </button>
                )
            )}
            <button
                type="button"
                aria-label="Editar"
                title="Editar"
                onClick={() => setEditTemplate(t)}
                className={`${ICON} text-muted-foreground hover:text-foreground`}
            >
                <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label="Eliminar"
                title="Eliminar"
                onClick={() => setDeleteTarget(t)}
                className={`${ICON} text-red-600 hover:bg-red-50`}
            >
                <Trash2 className="size-4" aria-hidden="true" />
            </button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gastos fijos recurrentes" />

            <TemplateFormDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                categories={categories}
                branches={branches}
                userBranchId={userBranchId}
            />

            {editTemplate && (
                <TemplateFormDialog
                    open={Boolean(editTemplate)}
                    onClose={() => setEditTemplate(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    template={editTemplate}
                />
            )}

            <QuickRegisterDialog
                key={registerTemplate?.id ?? 'none'}
                template={registerTemplate}
                branches={branches}
                userBranchId={userBranchId}
                onClose={() => setRegisterTemplate(null)}
            />

            <ConfirmActionDialog
                open={Boolean(unregisterTarget)}
                title="Des-registrar pago"
                description={`¿Deseas des-registrar el pago de "${unregisterTarget?.name}" de este mes? El gasto será eliminado.`}
                confirmLabel="Des-registrar"
                destructive
                onConfirm={confirmUnregister}
                onCancel={() => setUnregisterTarget(null)}
            />

            <DeleteWithReasonDialog
                open={Boolean(deleteTarget)}
                title="Eliminar gasto fijo"
                description={
                    deleteTarget && (
                        <span>
                            ¿Eliminar <strong>{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
                        </span>
                    )
                }
                confirmLabel="Eliminar"
                processing={deleting}
                onConfirm={confirmDelete}
                onClose={() => setDeleteTarget(null)}
            />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gastos fijos recurrentes</h1>
                        <p className="text-sm text-muted-foreground">Configura los gastos que se repiten cada mes para registrarlos fácilmente</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo gasto fijo
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <header className="px-5 pt-4 pb-3">
                        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Mis gastos fijos ({templates.length})</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Cada gasto fijo activo aparecerá para registro rápido al inicio de cada mes
                        </p>
                    </header>

                    {templates.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <CalendarClock className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">Sin gastos fijos configurados</p>
                            <p className="text-sm text-muted-foreground">
                                Agrega los gastos que pagas cada mes, como arriendo, servicios o suscripciones
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCreate(true)}
                                className="flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold sm:h-9"
                                style={{ color: onBrand.hex }}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Agregar primer gasto fijo
                            </button>
                        </div>
                    ) : isWide ? (
                        <table className="w-full text-sm">
                            <caption className="sr-only">Gastos fijos recurrentes</caption>
                            <thead>
                                <tr className="border-y border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Nombre
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Categoría
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-medium">
                                        Monto referencia
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Vencimiento
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Estado
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {templates.map((t) => (
                                    <tr key={t.id} className="hover:bg-muted/40">
                                        <td className="px-6 py-3 font-medium">{t.name}</td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            {t.category ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <ColorDot color={t.category.color} />
                                                    {t.category.name}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{cop(t.reference_amount)}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{t.due_day ? `Día ${t.due_day}` : '—'}</td>
                                        <td className="px-3 py-3">
                                            <DueStatusPill status={t.due_status} />
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end">{actions(t)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <ul className="divide-y divide-border/40 border-t border-border/60">
                            {templates.map((t) => (
                                <li key={t.id} className="flex flex-col gap-2 px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-[15px] font-semibold">{t.name}</p>
                                            {t.category && (
                                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <ColorDot color={t.category.color} className="size-2" />
                                                    {t.category.name}
                                                </p>
                                            )}
                                        </div>
                                        <p className="shrink-0 text-[15px] font-bold tabular-nums">{cop(t.reference_amount)}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <DueStatusPill status={t.due_status} className="px-2 py-0.5" />
                                            {t.due_day && <span className="text-xs text-muted-foreground">Día {t.due_day}</span>}
                                        </div>
                                        {actions(t)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
