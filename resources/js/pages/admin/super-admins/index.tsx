import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
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

interface FlashProps {
    flash: { success?: string };
    errors: { status?: string };
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Super Admins', href: '/admin/super-admins' }];

export default function SuperAdminsIndex({ superAdmins }: { superAdmins: SuperAdminRow[] }) {
    const { props } = usePage<FlashProps>();
    const [toggleTarget, setToggleTarget] = useState<SuperAdminRow | null>(null);

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
    }, [props.flash?.success]);

    useEffect(() => {
        if (props.errors?.status) toast.error(props.errors.status);
    }, [props.errors?.status]);

    const confirmToggle = () => {
        if (!toggleTarget) return;
        router.post(
            `/admin/super-admins/${toggleTarget.id}/toggle-status`,
            {},
            { preserveScroll: true, onFinish: () => setToggleTarget(null) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Super Admins" />
            <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Super Admins</h1>
                        <p className="text-xs text-muted-foreground">Cuentas con acceso total a la plataforma.</p>
                    </div>
                    <Link
                        href="/admin/super-admins/create"
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo super admin
                    </Link>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{superAdmins.length} cuenta(s)</p>
                    </div>
                    <div className="overflow-x-auto">
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
                                            <p className="font-medium">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">{s.email}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                                    s.status
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {s.status ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">
                                            {s.last_login_at ? formatDateTime(s.last_login_at) : 'Nunca'}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => setToggleTarget(s)}
                                                className="ml-auto flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                {s.status ? (
                                                    <>
                                                        <Pause className="h-3 w-3" /> Desactivar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="h-3 w-3" /> Activar
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {superAdmins.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            Sin super admins todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                        <button
                            onClick={() => setToggleTarget(null)}
                            className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmToggle}
                            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Confirmar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
