import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { TENANT_STATUS_LABELS, TENANT_STATUS_PILL_CLASS } from '@/lib/tenant-status';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Building2, ChevronLeft, Key, LogIn, Pencil, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface TenantDetail {
    id: number;
    name: string;
    slug: string;
    status: string;
    plan: string | null;
    created_at: string | null;
    can_impersonate: boolean;
}

interface TenantUser {
    id: number;
    name: string;
    email: string;
    role: string;
    status: boolean;
}

interface TenantBranch {
    id: number;
    name: string;
    status: boolean;
}

interface Metrics {
    users_count: number;
    products_count: number;
    sales_count: number;
}

interface Props {
    tenant: TenantDetail;
    metrics: Metrics;
    users: TenantUser[];
    branches: TenantBranch[];
}

interface FlashProps {
    flash: { success?: string; temporaryPassword?: string };
    [key: string]: unknown;
}

const ROLE_LABELS: Record<string, string> = {
    administrador: 'Administrador',
    encargado: 'Encargado',
    vendedor: 'Vendedor',
};

export default function TenantShow({ tenant, metrics, users, branches }: Props) {
    const { props } = usePage<FlashProps>();
    const [editing, setEditing] = useState(false);
    const [revealedPassword, setRevealedPassword] = useState<{ userName: string; password: string } | null>(null);
    const [pendingResetUserId, setPendingResetUserId] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'impersonate'; user: TenantUser } | null>(null);
    const impersonateForm = useForm({ password: '' });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Negocios', href: '/admin/tenants' },
        { title: tenant.name, href: `/admin/tenants/${tenant.id}` },
    ];

    const form = useForm({
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan ?? '',
    });

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
    }, [props.flash?.success]);

    useEffect(() => {
        if (props.flash?.temporaryPassword && pendingResetUserId !== null) {
            const user = users.find((u) => u.id === pendingResetUserId);
            setRevealedPassword({ userName: user?.name ?? 'usuario', password: props.flash.temporaryPassword });
            setPendingResetUserId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.flash?.temporaryPassword]);

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/admin/tenants/${tenant.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const resetPassword = (user: TenantUser) => {
        setPendingResetUserId(user.id);
        router.post(
            `/admin/tenants/${tenant.id}/users/${user.id}/reset-password`,
            {},
            {
                preserveScroll: true,
                onError: () => setPendingResetUserId(null),
            },
        );
    };

    const openConfirm = (type: 'reset' | 'impersonate', user: TenantUser) => {
        impersonateForm.reset();
        impersonateForm.clearErrors();
        setConfirmAction({ type, user });
    };

    const submitConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmAction) return;

        if (confirmAction.type === 'reset') {
            resetPassword(confirmAction.user);
            setConfirmAction(null);
            return;
        }

        impersonateForm.post(`/admin/tenants/${tenant.id}/users/${confirmAction.user.id}/impersonate`, {
            onSuccess: () => setConfirmAction(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={tenant.name} />
            <div className="flex flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/tenants"
                            aria-label="Volver a negocios"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl leading-tight font-bold">{tenant.name}</h1>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${TENANT_STATUS_PILL_CLASS[tenant.status] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {TENANT_STATUS_LABELS[tenant.status] ?? tenant.status}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {tenant.slug}
                                {tenant.plan && ` · Plan ${tenant.plan}`}
                                {tenant.created_at && ` · Creado el ${formatDate(tenant.created_at)}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/admin/tenants/${tenant.id}/roles`}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Roles y permisos
                        </Link>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                        </button>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Usuarios</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{metrics.users_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Productos</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{metrics.products_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Ventas</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{metrics.sales_count}</p>
                    </div>
                </div>

                {/* Users */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{users.length} usuario(s)</p>
                    </div>
                    <div className="divide-y divide-border/40">
                        {users.map((u) => (
                            <div key={u.id} className="flex items-center justify-between gap-3 px-6 py-3">
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
                                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                        {ROLE_LABELS[u.role] ?? u.role}
                                    </span>
                                    <button
                                        onClick={() => openConfirm('reset', u)}
                                        title={`Restablecer contraseña de ${u.name}`}
                                        className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                        <Key className="h-3 w-3" />
                                        Restablecer
                                    </button>
                                    <button
                                        onClick={() => openConfirm('impersonate', u)}
                                        disabled={!u.status || !tenant.can_impersonate}
                                        title={
                                            !u.status
                                                ? 'No se puede entrar como un usuario inactivo'
                                                : !tenant.can_impersonate
                                                  ? 'El negocio debe estar activo para entrar'
                                                  : `Entrar como ${u.name}`
                                        }
                                        className="flex items-center gap-1 rounded-lg border border-amber-200 bg-card px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    >
                                        <LogIn className="h-3 w-3" />
                                        Entrar
                                    </button>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">Sin usuarios todavía.</p>}
                    </div>
                </div>

                {/* Branches */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{branches.length} sucursal(es)</p>
                    </div>
                    <div className="divide-y divide-border/40">
                        {branches.map((b) => (
                            <div key={b.id} className="flex items-center justify-between gap-3 px-6 py-3">
                                <p className="text-sm font-medium">{b.name}</p>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        b.status
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {b.status ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        ))}
                        {branches.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">Sin sucursales todavía.</p>}
                    </div>
                </div>
            </div>

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold">Editar negocio</h2>
                            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={submitEdit} className="flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="edit-name" className="text-xs font-medium">
                                    Nombre
                                </label>
                                <input
                                    id="edit-name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="edit-slug" className="text-xs font-medium">
                                    Slug
                                </label>
                                <input
                                    id="edit-slug"
                                    value={form.data.slug}
                                    onChange={(e) => form.setData('slug', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {form.errors.slug && <p className="text-xs text-red-500">{form.errors.slug}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="edit-plan" className="text-xs font-medium">
                                    Plan (opcional)
                                </label>
                                <input
                                    id="edit-plan"
                                    value={form.data.plan}
                                    onChange={(e) => form.setData('plan', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revealed temporary password */}
            {revealedPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6">
                        <h2 className="mb-1 text-base font-bold">Contraseña temporal</h2>
                        <p className="mb-4 text-xs text-muted-foreground">
                            Nueva contraseña para <span className="font-medium">{revealedPassword.userName}</span>. Cópiala ahora — no se mostrará
                            de nuevo.
                        </p>
                        <code className="block rounded-lg border border-border/60 bg-muted px-3 py-2 text-center text-sm font-semibold tracking-wider">
                            {revealedPassword.password}
                        </code>
                        <button
                            onClick={() => setRevealedPassword(null)}
                            className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Listo
                        </button>
                    </div>
                </div>
            )}

            <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent>
                    <form onSubmit={submitConfirm}>
                        <DialogHeader>
                            <DialogTitle>{confirmAction?.type === 'reset' ? 'Restablecer contraseña' : 'Entrar como este usuario'}</DialogTitle>
                            <DialogDescription>
                                {confirmAction?.type === 'reset'
                                    ? `¿Generar una nueva contraseña temporal para ${confirmAction.user.name}?`
                                    : `¿Entrar como ${confirmAction?.user.name}? Actuarás con todos sus permisos hasta que salgas de la sesión.`}
                            </DialogDescription>
                        </DialogHeader>
                        {confirmAction?.type === 'impersonate' && (
                            <div className="mt-4 space-y-1.5">
                                <label htmlFor="impersonate-password" className="text-xs font-medium">
                                    Confirma tu contraseña
                                </label>
                                <input
                                    id="impersonate-password"
                                    type="password"
                                    autoFocus
                                    value={impersonateForm.data.password}
                                    onChange={(e) => impersonateForm.setData('password', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {impersonateForm.errors.password && <p className="text-xs text-red-500">{impersonateForm.errors.password}</p>}
                            </div>
                        )}
                        <DialogFooter className="mt-4">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={confirmAction?.type === 'impersonate' && impersonateForm.processing}
                                className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                            >
                                Confirmar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
