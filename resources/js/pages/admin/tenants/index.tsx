import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/format';
import { TENANT_STATUS_DOT_CLASS, TENANT_STATUS_LABELS, TENANT_STATUS_PILL_CLASS } from '@/lib/tenant-status';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Archive, Building2, Pause, Play, Plus, Search, Trash2, UserRound, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

interface Summary {
    tenants_active: number;
    tenants_suspended: number;
    tenants_trial: number;
    users_total: number;
    sales_total: number;
    sales_volume: number;
}

interface UserMatch {
    id: number;
    name: string;
    email: string;
    status: boolean;
    tenant: { id: number; name: string } | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Negocios', href: '/admin/tenants' }];

export default function TenantsIndex({
    tenants,
    summary,
    search: initialSearch,
    userMatches,
}: {
    tenants: TenantRow[];
    summary: Summary;
    search: string;
    userMatches: UserMatch[];
}) {
    const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
    const [search, setSearch] = useState(initialSearch);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip the debounced reload on mount — search already equals
        // initialSearch then, so firing here would just replay the exact
        // same request (or a bookmarked ?search=... link) a moment later.
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            router.visit(`/admin/tenants?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['tenants', 'search', 'userMatches'],
            });
        }, 350);
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [search]);

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
                    <div className="flex gap-2">
                        <Link
                            href="/admin/tenants/archived"
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Archive className="h-3.5 w-3.5" />
                            Archivados
                        </Link>
                        <Link
                            href="/admin/tenants/create"
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo negocio
                        </Link>
                    </div>
                </div>

                {/* Platform summary */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Activos</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{summary.tenants_active}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Suspendidos</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{summary.tenants_suspended}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">En prueba</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{summary.tenants_trial}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Usuarios</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{summary.users_total}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Ventas</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{summary.sales_total}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Volumen procesado</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(summary.sales_volume)}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar negocio por nombre/slug, o usuario por nombre/email..."
                        className="w-full rounded-lg border border-border/60 bg-card py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                    />
                </div>

                {/* Cross-tenant user matches */}
                {userMatches.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                        <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {userMatches.length} usuario(s) encontrado(s)
                            </p>
                        </div>
                        <div className="divide-y divide-border/40">
                            {userMatches.map((u) => (
                                <Link
                                    key={u.id}
                                    href={u.tenant ? `/admin/tenants/${u.tenant.id}` : '#'}
                                    className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/30"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{u.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {!u.status && (
                                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                Inactivo
                                            </span>
                                        )}
                                        {u.tenant && (
                                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                {u.tenant.name}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

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
                                            <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                                                {t.name}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{t.slug}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${TENANT_STATUS_PILL_CLASS[t.status] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${TENANT_STATUS_DOT_CLASS[t.status] ?? 'bg-muted-foreground'}`} />
                                                {TENANT_STATUS_LABELS[t.status] ?? t.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 tabular-nums">{t.users_count}</td>
                                        <td className="px-3 py-3 tabular-nums">{t.products_count}</td>
                                        <td className="px-3 py-3 tabular-nums">{t.sales_count}</td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(t.created_at)}</td>
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
                                            {search ? (
                                                <>
                                                    <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                                                    Sin negocios que coincidan con «{search}».
                                                </>
                                            ) : (
                                                'Aún no hay negocios. Crea el primero.'
                                            )}
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
