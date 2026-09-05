import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface TenantRow {
    id: number;
    name: string;
    slug: string;
    status: string;
    created_at: string | null;
    users_count: number;
    products_count: number;
    sales_count: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Negocios', href: '/admin/tenants' }];

const STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    suspended: 'Suspendido',
    trial: 'Prueba',
};

const STATUS_PILL_CLASS: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    suspended: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
    trial: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

const STATUS_DOT_CLASS: Record<string, string> = {
    active: 'bg-emerald-500',
    suspended: 'bg-red-500',
    trial: 'bg-amber-500',
};

export default function TenantsIndex({ tenants }: { tenants: TenantRow[] }) {
    const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);

    const toggle = (t: TenantRow) => {
        const action = t.status === 'suspended' ? 'activate' : 'suspend';
        router.post(`/admin/tenants/${t.id}/${action}`, {}, { preserveScroll: true });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(`/admin/tenants/${deleteTarget.id}`, {
            preserveScroll: true,
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Negocios" />
            <div className="flex flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Negocios</h1>
                        <p className="text-xs text-muted-foreground">Gestiona los clientes de la plataforma.</p>
                    </div>
                    <Link
                        href="/admin/tenants/create"
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo negocio
                    </Link>
                </div>

                {/* Table card */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{tenants.length} negocio(s)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                    <th className="px-6 py-2.5 font-medium">Negocio</th>
                                    <th className="px-3 py-2.5 font-medium">Estado</th>
                                    <th className="px-3 py-2.5 font-medium">Usuarios</th>
                                    <th className="px-3 py-2.5 font-medium">Productos</th>
                                    <th className="px-3 py-2.5 font-medium">Ventas</th>
                                    <th className="px-3 py-2.5 font-medium">Creado</th>
                                    <th className="px-6 py-2.5 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {tenants.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-muted/30">
                                        <td className="px-6 py-3">
                                            <div className="font-medium">{t.name}</div>
                                            <div className="text-xs text-muted-foreground">{t.slug}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_PILL_CLASS[t.status] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[t.status] ?? 'bg-muted-foreground'}`} />
                                                {STATUS_LABELS[t.status] ?? t.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 tabular-nums">{t.users_count}</td>
                                        <td className="px-3 py-3 tabular-nums">{t.products_count}</td>
                                        <td className="px-3 py-3 tabular-nums">{t.sales_count}</td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{t.created_at}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => toggle(t)}
                                                    className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    {t.status === 'suspended' ? (
                                                        <>
                                                            <Play className="h-3 w-3" /> Activar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Pause className="h-3 w-3" /> Suspender
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    aria-label={`Eliminar negocio ${t.name}`}
                                                    title={`Eliminar ${t.name}`}
                                                    onClick={() => setDeleteTarget(t)}
                                                    className="flex items-center justify-center rounded-lg border border-red-200 bg-card p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {tenants.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            Aún no hay negocios. Crea el primero.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar negocio</DialogTitle>
                        <DialogDescription>
                            ¿Seguro que quieres eliminar «{deleteTarget?.name}»? Sus usuarios perderán el acceso. Los datos se conservan (eliminación
                            reversible).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                        >
                            Eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
