import { initialsOf, LastActivity, latestTimestamp, StatusPill, TrialNote } from '@/components/admin/tenant-badges';
import { SwipeActions, SwipeActionsRow, type SwipeAction } from '@/components/ui/arc/swipe-actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/format';
import { getRoleLabel } from '@/lib/roles';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight, Copy, History, Key, LogIn, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import toast from 'react-hot-toast';

interface TenantDetail {
    id: number;
    name: string;
    slug: string;
    status: string;
    plan: string | null;
    created_at: string | null;
    trial_ends_at: string | null;
    can_impersonate: boolean;
}

interface TenantUser {
    id: number;
    name: string;
    email: string;
    role: string;
    status: boolean;
    last_login_at: string | null;
}

interface TenantBranch {
    id: number;
    name: string;
    status: boolean;
}

interface TenantApiKey {
    id: number;
    name: string;
    key_prefix: string;
    can_manage_media: boolean;
    can_generate_order_references: boolean;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string | null;
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
    apiKeys: TenantApiKey[];
}

interface FlashProps {
    flash: { success?: string; temporaryPassword?: string; plainApiKey?: string };
    [key: string]: unknown;
}

const SECONDARY_BUTTON =
    'h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9 sm:px-3 sm:text-xs';
const PRIMARY_BUTTON =
    'h-11 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:px-3 sm:text-xs';
const DANGER_BUTTON = 'h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:px-3 sm:text-xs';
const INPUT =
    'h-11 w-full rounded-lg border border-border/60 bg-background px-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-9 sm:text-sm';
const PILL = 'rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground';

function Section({
    icon: Icon,
    title,
    action,
    children,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex min-h-9 items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Icon className="h-4 w-4" />
                    {title}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function EmptyNote({ children }: { children: ReactNode }) {
    return <p className="rounded-2xl border border-border/60 bg-card px-6 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

const MANAGEMENT_LINK =
    'flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export default function TenantShow({ tenant, metrics, users, branches, apiKeys }: Props) {
    const { props } = usePage<FlashProps>();
    const [editing, setEditing] = useState(false);
    const [revealedPassword, setRevealedPassword] = useState<{ userName: string; password: string } | null>(null);
    const [pendingResetUserId, setPendingResetUserId] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'impersonate'; user: TenantUser } | null>(null);
    const impersonateForm = useForm({ password: '' });
    const [creatingKey, setCreatingKey] = useState(false);
    const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
    const [revokingKey, setRevokingKey] = useState<TenantApiKey | null>(null);
    const apiKeyForm = useForm<{ name: string; can_manage_media: boolean; can_generate_order_references: boolean }>({
        name: '',
        can_manage_media: false,
        can_generate_order_references: false,
    });

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
        if (props.flash?.temporaryPassword && pendingResetUserId !== null) {
            const user = users.find((u) => u.id === pendingResetUserId);
            setRevealedPassword({ userName: user?.name ?? 'usuario', password: props.flash.temporaryPassword });
            setPendingResetUserId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.flash?.temporaryPassword]);

    useEffect(() => {
        if (props.flash?.plainApiKey) {
            setRevealedApiKey(props.flash.plainApiKey);
            setCreatingKey(false);
        }
    }, [props.flash?.plainApiKey]);

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

    const submitCreateKey = (e: React.FormEvent) => {
        e.preventDefault();
        apiKeyForm.post(`/admin/tenants/${tenant.id}/api-keys`, {
            preserveScroll: true,
            onSuccess: () => apiKeyForm.reset(),
        });
    };

    const revokeKey = () => {
        if (!revokingKey) return;
        router.delete(`/admin/tenants/${tenant.id}/api-keys/${revokingKey.id}`, {
            preserveScroll: true,
            onFinish: () => setRevokingKey(null),
        });
    };

    const copySecret = (value: string | null | undefined) => {
        if (!value) return;

        // navigator.clipboard is undefined outside a secure context (plain
        // HTTP, or an older/locked-down browser) — calling .writeText on it
        // throws synchronously, before the promise chain (and its .catch)
        // even starts, so that check has to happen first.
        if (!navigator.clipboard) {
            legacyCopy(value);
            return;
        }

        navigator.clipboard
            .writeText(value)
            .then(() => toast.success('Copiada al portapapeles'))
            .catch(() => legacyCopy(value));
    };

    // Fallback for a non-secure context: a temporary offscreen textarea plus
    // the older execCommand API, which doesn't require navigator.clipboard.
    const legacyCopy = (value: string) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (copied) {
                toast.success('Copiada al portapapeles');
            } else {
                toast.error('No se pudo copiar');
            }
        } catch {
            toast.error('No se pudo copiar');
        }
    };

    const lastActivity = latestTimestamp(users.map((u) => u.last_login_at));

    const userActions = (u: TenantUser): SwipeAction[] => {
        const actions: SwipeAction[] = [
            { label: 'Restablecer', icon: <Key />, tone: 'neutral', onSelect: () => openConfirm('reset', u), keepRow: true },
        ];
        if (u.status && tenant.can_impersonate) {
            actions.push({ label: 'Entrar', icon: <LogIn />, tone: 'accent', onSelect: () => openConfirm('impersonate', u), keepRow: true });
        }

        return actions;
    };

    const keyActions = (k: TenantApiKey): SwipeAction[] => [
        { label: 'Revocar', icon: <Trash2 />, tone: 'danger', onSelect: () => setRevokingKey(k), keepRow: true },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={tenant.name} />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <Link
                        href="/admin/tenants"
                        aria-label="Volver a negocios"
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h1 className="min-w-0 text-xl leading-tight font-bold break-words">{tenant.name}</h1>
                            <StatusPill status={tenant.status} />
                        </div>
                        <p className="mt-0.5 text-xs break-words text-muted-foreground">
                            {tenant.slug}
                            {tenant.plan && ` · Plan ${tenant.plan}`}
                            {tenant.created_at && ` · Creado el ${formatDate(tenant.created_at)}`}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <LastActivity at={lastActivity} />
                            <TrialNote trialEndsAt={tenant.trial_ends_at} />
                        </div>
                    </div>
                    <div className="hidden gap-2 md:flex">
                        <Link href={`/admin/impersonations?tenant_id=${tenant.id}`} className={MANAGEMENT_LINK}>
                            <History className="h-3.5 w-3.5" />
                            Historial de accesos
                        </Link>
                        <Link href={`/admin/tenants/${tenant.id}/roles`} className={MANAGEMENT_LINK}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Roles y permisos
                        </Link>
                        <button onClick={() => setEditing(true)} className={MANAGEMENT_LINK}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                        </button>
                    </div>
                </div>

                {/* Management shortcuts: a tappable list on phones */}
                <nav
                    aria-label="Gestión del negocio"
                    className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card md:hidden"
                >
                    <button onClick={() => setEditing(true)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm font-medium">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">Editar datos del negocio</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <Link href={`/admin/tenants/${tenant.id}/roles`} className="flex min-h-14 items-center gap-3 px-4 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">Roles y permisos</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href={`/admin/impersonations?tenant_id=${tenant.id}`} className="flex min-h-14 items-center gap-3 px-4 text-sm font-medium">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">Historial de accesos</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                </nav>

                {/* Users */}
                <Section icon={Users} title={`${metrics.users_count} usuario(s)`}>
                    {users.length > 0 && !tenant.can_impersonate && (
                        <p className="text-xs text-muted-foreground">El negocio debe estar activo para entrar como uno de sus usuarios.</p>
                    )}
                    {users.length === 0 ? (
                        <EmptyNote>Sin usuarios todavía.</EmptyNote>
                    ) : (
                        <>
                            <div className="md:hidden">
                                <SwipeActions label={`${users.length} usuario(s)`}>
                                    {users.map((u) => (
                                        <SwipeActionsRow key={u.id} label={u.name} trailing={userActions(u)}>
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    aria-hidden="true"
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]"
                                                >
                                                    {initialsOf(u.name)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[15px] leading-tight font-semibold">{u.name}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <span className={PILL}>{getRoleLabel(u.role)}</span>
                                                        {!u.status && <span className={PILL}>Inactivo</span>}
                                                        <span className="text-xs text-muted-foreground">
                                                            {u.last_login_at
                                                                ? `Último acceso ${formatRelativeTime(u.last_login_at)}`
                                                                : 'Nunca ha ingresado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwipeActionsRow>
                                    ))}
                                </SwipeActions>
                            </div>

                            <div className="hidden divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card md:block">
                                {users.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between gap-3 px-6 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{u.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                Último acceso: {u.last_login_at ? formatDateTime(u.last_login_at) : 'Nunca'}
                                            </p>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-2">
                                            {!u.status && <span className={PILL}>Inactivo</span>}
                                            <span className={PILL}>{getRoleLabel(u.role)}</span>
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
                            </div>
                        </>
                    )}
                </Section>

                {/* Branches */}
                <Section icon={Building2} title={`${branches.length} sucursal(es)`}>
                    {branches.length === 0 ? (
                        <EmptyNote>Sin sucursales todavía.</EmptyNote>
                    ) : (
                        <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
                            {branches.map((b) => (
                                <li key={b.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 sm:px-6">
                                    <p className="min-w-0 truncate text-sm font-medium">{b.name}</p>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                            b.status
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {b.status ? 'Activa' : 'Inactiva'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {/* Storefront API keys */}
                <Section
                    icon={Key}
                    title={`${apiKeys.length} API key(s) — tienda pública`}
                    action={
                        <button
                            onClick={() => {
                                apiKeyForm.reset();
                                apiKeyForm.clearErrors();
                                setCreatingKey(true);
                            }}
                            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:text-xs"
                        >
                            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            Generar key
                        </button>
                    }
                >
                    {apiKeys.length === 0 ? (
                        <EmptyNote>Sin API keys todavía — genera una para conectar la tienda pública de este negocio.</EmptyNote>
                    ) : (
                        <SwipeActions label={`${apiKeys.length} API key(s)`}>
                            {apiKeys.map((k) =>
                                k.revoked_at ? (
                                    <li
                                        key={k.id}
                                        className="flex min-h-16 flex-col justify-center gap-0.5 border-b border-border/40 px-4 py-3 last:border-b-0"
                                    >
                                        <p className="truncate text-sm font-medium text-muted-foreground line-through">{k.name}</p>
                                        <p className="truncate font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
                                        <span className={`${PILL} self-start`}>Revocada {formatDate(k.revoked_at)}</span>
                                    </li>
                                ) : (
                                    <SwipeActionsRow key={k.id} label={k.name} trailing={keyActions(k)}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-[15px] leading-tight font-semibold">{k.name}</p>
                                                <p className="truncate font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
                                                {(k.can_manage_media || k.can_generate_order_references) && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {k.can_manage_media && (
                                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                                                                Gestiona fotos/visibilidad
                                                            </span>
                                                        )}
                                                        {k.can_generate_order_references && (
                                                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                                                                Genera referencias de pedido
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                                    {k.last_used_at ? `Usada por última vez ${formatRelativeTime(k.last_used_at)}` : 'Nunca usada'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setRevokingKey(k)}
                                                title={`Revocar «${k.name}»`}
                                                className="hidden shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-card px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 md:flex dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Revocar
                                            </button>
                                        </div>
                                    </SwipeActionsRow>
                                ),
                            )}
                        </SwipeActions>
                    )}
                </Section>
            </div>

            {/* Edit */}
            <Dialog open={editing} onOpenChange={(open) => !open && setEditing(false)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={submitEdit} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>Editar negocio</DialogTitle>
                            <DialogDescription>Cambia el nombre, el slug o el plan de «{tenant.name}».</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                            <label htmlFor="edit-name" className="text-xs font-medium">
                                Nombre
                            </label>
                            <input id="edit-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className={INPUT} />
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
                                autoCapitalize="none"
                                autoCorrect="off"
                                className={INPUT}
                            />
                            {form.errors.slug && <p className="text-xs text-red-500">{form.errors.slug}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="edit-plan" className="text-xs font-medium">
                                Plan (opcional)
                            </label>
                            <input id="edit-plan" value={form.data.plan} onChange={(e) => form.setData('plan', e.target.value)} className={INPUT} />
                        </div>
                        <DialogFooter>
                            <button type="button" onClick={() => setEditing(false)} className={SECONDARY_BUTTON}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={form.processing} className={PRIMARY_BUTTON}>
                                Guardar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Temporary password: shown once, so it only closes on purpose */}
            <Dialog open={revealedPassword !== null} onOpenChange={(open) => !open && setRevealedPassword(null)}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Contraseña temporal</DialogTitle>
                        <DialogDescription>
                            Nueva contraseña para <span className="font-medium">{revealedPassword?.userName}</span>. Cópiala ahora — no se mostrará de
                            nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <code className="block min-w-0 flex-1 rounded-lg border border-border/60 bg-muted px-3 py-3 text-center text-base font-semibold tracking-wider break-all">
                            {revealedPassword?.password}
                        </code>
                        <button
                            onClick={() => copySecret(revealedPassword?.password)}
                            aria-label="Copiar contraseña"
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setRevealedPassword(null)} className={PRIMARY_BUTTON}>
                            Listo
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* API key: shown once, so it only closes on purpose */}
            <Dialog open={revealedApiKey !== null} onOpenChange={(open) => !open && setRevealedApiKey(null)}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>API key generada</DialogTitle>
                        <DialogDescription>
                            Cópiala ahora y entrégala de forma segura a quien construya la tienda — no se mostrará de nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border border-border/60 bg-muted px-3 py-3 text-xs font-semibold whitespace-nowrap">
                            {revealedApiKey}
                        </code>
                        <button
                            onClick={() => copySecret(revealedApiKey)}
                            aria-label="Copiar API key"
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setRevealedApiKey(null)} className={PRIMARY_BUTTON}>
                            Listo
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={creatingKey} onOpenChange={(open) => !open && setCreatingKey(false)}>
                <DialogContent>
                    <form onSubmit={submitCreateKey} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>Generar API key</DialogTitle>
                            <DialogDescription>
                                Para «{tenant.name}». Úsala para conectar su tienda pública a la API de solo lectura del catálogo.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1.5">
                            <label htmlFor="api-key-name" className="text-xs font-medium">
                                Nombre (para identificarla después)
                            </label>
                            <input
                                id="api-key-name"
                                autoFocus
                                placeholder="Storefront producción"
                                value={apiKeyForm.data.name}
                                onChange={(e) => apiKeyForm.setData('name', e.target.value)}
                                className={INPUT}
                            />
                            {apiKeyForm.errors.name && <p className="text-xs text-red-500">{apiKeyForm.errors.name}</p>}
                        </div>
                        <label className="flex min-h-11 items-start gap-3 text-xs">
                            <input
                                type="checkbox"
                                checked={apiKeyForm.data.can_manage_media}
                                onChange={(e) => apiKeyForm.setData('can_manage_media', e.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0"
                            />
                            <span>
                                <span className="font-medium">Gestionar fotos y visibilidad de productos</span>
                                <br />
                                <span className="text-muted-foreground">
                                    Permite subir/borrar fotos de la galería y activar/ocultar productos vía API. Las keys ya generadas no obtienen
                                    este permiso automáticamente.
                                </span>
                            </span>
                        </label>
                        <label className="flex min-h-11 items-start gap-3 text-xs">
                            <input
                                type="checkbox"
                                checked={apiKeyForm.data.can_generate_order_references}
                                onChange={(e) => apiKeyForm.setData('can_generate_order_references', e.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0"
                            />
                            <span>
                                <span className="font-medium">Permitir generar números de referencia de pedido</span>
                                <br />
                                <span className="text-muted-foreground">
                                    Permite pedir un número de referencia (ej. LUACCESORIOS-000123) para su mensaje de WhatsApp de checkout. No crea
                                    ninguna venta ni pedido en Stokity. Independiente del permiso de fotos.
                                </span>
                            </span>
                        </label>
                        <DialogFooter>
                            <button type="button" onClick={() => setCreatingKey(false)} className={SECONDARY_BUTTON}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={apiKeyForm.processing} className={PRIMARY_BUTTON}>
                                Generar
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={revokingKey !== null} onOpenChange={(open) => !open && setRevokingKey(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revocar API key</DialogTitle>
                        <DialogDescription>
                            ¿Revocar «{revokingKey?.name}»? La tienda pública dejará de poder leer el catálogo de inmediato — esto no se puede
                            deshacer, habría que generar una key nueva.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button type="button" onClick={() => setRevokingKey(null)} className={SECONDARY_BUTTON}>
                            Cancelar
                        </button>
                        <button type="button" onClick={revokeKey} className={DANGER_BUTTON}>
                            Revocar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent>
                    <form onSubmit={submitConfirm} className="flex flex-col gap-4">
                        <DialogHeader>
                            <DialogTitle>{confirmAction?.type === 'reset' ? 'Restablecer contraseña' : 'Entrar como este usuario'}</DialogTitle>
                            <DialogDescription>
                                {confirmAction?.type === 'reset'
                                    ? `¿Generar una nueva contraseña temporal para ${confirmAction.user.name}?`
                                    : `¿Entrar como ${confirmAction?.user.name}? Actuarás con todos sus permisos hasta que salgas de la sesión.`}
                            </DialogDescription>
                        </DialogHeader>
                        {confirmAction?.type === 'impersonate' && (
                            <div className="space-y-1.5">
                                <label htmlFor="impersonate-password" className="text-xs font-medium">
                                    Confirma tu contraseña
                                </label>
                                <input
                                    id="impersonate-password"
                                    type="password"
                                    autoFocus
                                    autoComplete="current-password"
                                    value={impersonateForm.data.password}
                                    onChange={(e) => impersonateForm.setData('password', e.target.value)}
                                    className={INPUT}
                                />
                                {impersonateForm.errors.password && <p className="text-xs text-red-500">{impersonateForm.errors.password}</p>}
                            </div>
                        )}
                        <DialogFooter>
                            <button type="button" onClick={() => setConfirmAction(null)} className={SECONDARY_BUTTON}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={confirmAction?.type === 'impersonate' && impersonateForm.processing}
                                className={PRIMARY_BUTTON}
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
