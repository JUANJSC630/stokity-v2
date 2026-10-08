import { OUTLINE_ACTION, PILL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/admin/styles';
import { initialsOf } from '@/components/admin/tenant-badges';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/format';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pause, Play, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface SuperAdminRow {
    id: number;
    name: string;
    email: string;
    status: boolean;
    last_login_at: string | null;
    created_at: string;
}

interface FlashProps extends SharedData {
    errors: { status?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Super Admins', href: '/admin/super-admins' }];

const ACTIVE_PILL = 'rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';

function StatePill({ active }: { active: boolean }) {
    return <span className={active ? ACTIVE_PILL : PILL}>{active ? 'Activo' : 'Inactivo'}</span>;
}

function ToggleButton({ admin, isSelf, onToggle }: { admin: SuperAdminRow; isSelf: boolean; onToggle: (admin: SuperAdminRow) => void }) {
    const label = admin.status ? 'Desactivar' : 'Activar';
    const Icon = admin.status ? Pause : Play;

    return (
        <button
            onClick={() => onToggle(admin)}
            disabled={isSelf}
            aria-label={`${label} a ${admin.name}`}
            title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
            className={`${OUTLINE_ACTION} disabled:pointer-events-none disabled:opacity-50`}
        >
            <Icon className="h-4 w-4 sm:h-3 sm:w-3" />
            {label}
        </button>
    );
}

export default function SuperAdminsIndex({ superAdmins }: { superAdmins: SuperAdminRow[] }) {
    const { props } = usePage<FlashProps>();
    const currentUserId = props.auth?.user?.id;
    const [toggleTarget, setToggleTarget] = useState<SuperAdminRow | null>(null);

    useEffect(() => {
        if (props.errors?.status) toast.error(props.errors.status);
    }, [props.errors?.status]);

    const confirmToggle = () => {
        if (!toggleTarget) return;
        router.post(`/admin/super-admins/${toggleTarget.id}/toggle-status`, {}, { preserveScroll: true, onFinish: () => setToggleTarget(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Super Admins" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Super Admins</h1>
                        <p className="text-xs text-muted-foreground">Cuentas con acceso total a la plataforma.</p>
                    </div>
                    <Link
                        href="/admin/super-admins/create"
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:px-3 sm:text-xs"
                    >
                        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        Nuevo super admin
                    </Link>
                </div>

                {superAdmins.length === 0 ? (
                    <p className="rounded-2xl border border-border/60 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                        Sin super admins todavía.
                    </p>
                ) : (
                    <>
                        <ul
                            aria-label={`${superAdmins.length} cuenta(s)`}
                            className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card md:hidden"
                        >
                            {superAdmins.map((s) => (
                                <li key={s.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]"
                                        >
                                            {initialsOf(s.name)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <p className="min-w-0 truncate text-[15px] leading-tight font-semibold">{s.name}</p>
                                                {s.id === currentUserId && <span className={PILL}>Tú</span>}
                                                <StatePill active={s.status} />
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {s.last_login_at ? `Último acceso ${formatRelativeTime(s.last_login_at)}` : 'Nunca ha ingresado'}
                                            </p>
                                        </div>
                                    </div>
                                    <ToggleButton admin={s} isSelf={s.id === currentUserId} onToggle={setToggleTarget} />
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card md:block">
                            <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{superAdmins.length} cuenta(s)</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                        <th className="px-6 py-2.5 font-medium">Nombre</th>
                                        <th className="px-3 py-2.5 font-medium">Estado</th>
                                        <th className="px-3 py-2.5 font-medium">Último acceso</th>
                                        <th className="px-3 py-2.5 font-medium">Creado</th>
                                        <th className="px-6 py-2.5 text-right font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {superAdmins.map((s) => (
                                        <tr key={s.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-6 py-3">
                                                <p className="font-medium">
                                                    {s.name} {s.id === currentUserId && <span className={PILL}>Tú</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{s.email}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatePill active={s.status} />
                                            </td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground">
                                                {s.last_login_at ? formatDateTime(s.last_login_at) : 'Nunca'}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end">
                                                    <ToggleButton admin={s} isSelf={s.id === currentUserId} onToggle={setToggleTarget} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={toggleTarget !== null} onOpenChange={(open) => !open && setToggleTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{toggleTarget?.status ? 'Desactivar' : 'Activar'} super admin</DialogTitle>
                        <DialogDescription>
                            ¿{toggleTarget?.status ? 'Desactivar' : 'Activar'} a «{toggleTarget?.name}»?
                            {toggleTarget?.status && ' No podrá iniciar sesión hasta que lo reactives.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button onClick={() => setToggleTarget(null)} className={SECONDARY_BUTTON}>
                            Cancelar
                        </button>
                        <button onClick={confirmToggle} className={PRIMARY_BUTTON}>
                            Confirmar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
