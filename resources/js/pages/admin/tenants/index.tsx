import { initialsOf, LastActivity, StatusPill, TrialNote } from '@/components/admin/tenant-badges';
import { HoldToConfirm } from '@/components/ui/arc/hold-to-confirm';
import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
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
    trial_ends_at: string | null;
    last_activity_at: string | null;
}

interface UserMatch {
    id: number;
    name: string;
    email: string;
    status: boolean;
    tenant: { id: number; name: string } | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Negocios', href: '/admin/tenants' }];

type StatusFilter = 'all' | 'active' | 'trial' | 'suspended';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'trial', label: 'Prueba' },
    { value: 'suspended', label: 'Suspendidos' },
];

export default function TenantsIndex({
    tenants,
    search: initialSearch,
    userMatches,
}: {
    tenants: TenantRow[];
    search: string;
    userMatches: UserMatch[];
}) {
    const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
    const [search, setSearch] = useState(initialSearch);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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

    const countFor = (value: StatusFilter) => (value === 'all' ? tenants.length : tenants.filter((t) => t.status === value).length);
    const availableFilters = STATUS_FILTERS.filter(({ value }) => value === 'all' || countFor(value) > 0);
    const showFilters = availableFilters.length > 2;
    const activeFilter: StatusFilter = showFilters && countFor(statusFilter) > 0 ? statusFilter : 'all';
    const visibleTenants = activeFilter === 'all' ? tenants : tenants.filter((t) => t.status === activeFilter);

    const emptyMessage = search ? (
        <>
            <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            Sin negocios que coincidan con «{search}».
        </>
    ) : activeFilter !== 'all' ? (
        'Ningún negocio con este estado.'
    ) : (
        'Aún no hay negocios. Crea el primero.'
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Negocios" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Negocios</h1>
                        <p className="text-xs text-muted-foreground">Gestiona los clientes de la plataforma.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/admin/tenants/archived"
                            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:flex-none sm:px-3 sm:text-xs"
                        >
                            <Archive className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            Archivados
                        </Link>
                        <Link
                            href="/admin/tenants/create"
                            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:flex-none sm:px-3 sm:text-xs"
                        >
                            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            Nuevo negocio
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar negocio o usuario…"
                        aria-label="Buscar negocio por nombre o slug, o usuario por nombre o correo"
                        className="h-11 w-full rounded-lg border border-border/60 bg-card pr-3 pl-9 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm"
                    />
                </div>

                {/* Cross-tenant user matches */}
                {userMatches.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4 sm:px-6">
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
                                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{u.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                    <div className="flex max-w-[45%] flex-shrink-0 flex-col items-end gap-1 sm:max-w-none sm:flex-row sm:items-center sm:gap-2">
                                        {!u.status && (
                                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                Inactivo
                                            </span>
                                        )}
                                        {u.tenant && (
                                            <span className="max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                {u.tenant.name}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status filter: only when there is more than one status to tell apart */}
                {showFilters && (
                    <div
                        className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0"
                        role="group"
                        aria-label="Filtrar por estado"
                    >
                        {availableFilters.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={activeFilter === value}
                                onClick={() => setStatusFilter(value)}
                                className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors md:h-9 md:text-xs ${
                                    activeFilter === value
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {label}
                                <span className="text-[11px] tabular-nums opacity-80">{countFor(value)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Phones: swipeable list */}
                <div className="md:hidden">
                    {visibleTenants.length === 0 ? (
                        <div className="rounded-2xl border border-border/60 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <SwipeActions label={`${visibleTenants.length} negocio(s)`}>
                            {visibleTenants.map((t) => (
                                <SwipeActionsRow
                                    key={t.id}
                                    label={t.name}
                                    trailing={[
                                        {
                                            label: t.status === 'suspended' ? 'Activar' : 'Suspender',
                                            icon: t.status === 'suspended' ? <Play /> : <Pause />,
                                            tone: t.status === 'suspended' ? 'accent' : 'neutral',
                                            onSelect: () => toggle(t),
                                            keepRow: true,
                                        },
                                        { label: 'Eliminar', icon: <Trash2 />, tone: 'danger', onSelect: () => setDeleteTarget(t), keepRow: true },
                                    ]}
                                >
                                    <Link href={`/admin/tenants/${t.id}`} className="flex min-w-0 items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]"
                                        >
                                            {initialsOf(t.name)}
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[15px] leading-tight font-semibold">{t.name}</span>
                                                    <span className="block truncate text-xs text-muted-foreground">{t.slug}</span>
                                                </span>
                                                <StatusPill status={t.status} />
                                            </span>
                                            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                <LastActivity at={t.last_activity_at} />
                                                <TrialNote trialEndsAt={t.trial_ends_at} />
                                            </span>
                                        </span>
                                    </Link>
                                </SwipeActionsRow>
                            ))}
                        </SwipeActions>
                    )}
                </div>

                {/* Tablets and up: table */}
                <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card md:block">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{visibleTenants.length} negocio(s)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                    <th className="px-6 py-2.5 font-medium">Negocio</th>
                                    <th className="px-3 py-2.5 font-medium">Estado</th>
                                    <th className="px-3 py-2.5 font-medium">Última actividad</th>
                                    <th className="px-3 py-2.5 font-medium">Creado</th>
                                    <th className="px-6 py-2.5 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {visibleTenants.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-muted/30">
                                        <td className="px-6 py-3">
                                            <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                                                {t.name}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{t.slug}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusPill status={t.status} />
                                                <TrialNote trialEndsAt={t.trial_ends_at} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <LastActivity at={t.last_activity_at} />
                                        </td>
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
                                {visibleTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            {emptyMessage}
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
                    <DialogFooter className="gap-2">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9 sm:px-3 sm:text-xs"
                        >
                            Cancelar
                        </button>
                        <HoldToConfirm
                            label="Mantén para eliminar"
                            confirmedLabel="Eliminando…"
                            tone="danger"
                            onConfirm={confirmDelete}
                            className="w-full sm:w-auto"
                        />
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
