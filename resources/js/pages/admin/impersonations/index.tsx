import PaginationFooter from '@/components/common/PaginationFooter';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { History, ShieldAlert } from 'lucide-react';

interface LogUser {
    id: number;
    name: string;
    email: string;
}

interface LogRow {
    id: number;
    started_at: string;
    ended_at: string | null;
    ip_address: string | null;
    super_admin: LogUser | null;
    tenant: { id: number; name: string } | null;
    impersonated_user: LogUser | null;
}

interface Paginated<T> {
    data: T[];
    links: { label: string; url: string | null }[];
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Auditoría', href: '/admin/impersonations' }];

export default function ImpersonationLogIndex({ logs, tenantId }: { logs: Paginated<LogRow>; tenantId: number | null }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoría" />
            <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Auditoría de impersonación</h1>
                        <p className="text-xs text-muted-foreground">Cada vez que un super admin entra como un usuario, queda registrado aquí.</p>
                    </div>
                    {tenantId && (
                        <Link
                            href="/admin/impersonations"
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            Ver todos los negocios
                        </Link>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{logs.total} registro(s)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                    <th className="px-6 py-2.5 font-medium">Inicio</th>
                                    <th className="px-3 py-2.5 font-medium">Super admin</th>
                                    <th className="px-3 py-2.5 font-medium">Negocio</th>
                                    <th className="px-3 py-2.5 font-medium">Usuario impersonado</th>
                                    <th className="px-3 py-2.5 font-medium">Estado</th>
                                    <th className="px-6 py-2.5 font-medium">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {logs.data.map((log) => (
                                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                                        <td className="px-6 py-3 text-xs text-muted-foreground">{formatDateTime(log.started_at)}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{log.super_admin?.name ?? '—'}</p>
                                            <p className="text-xs text-muted-foreground">{log.super_admin?.email}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            {log.tenant ? (
                                                <Link href={`/admin/tenants/${log.tenant.id}`} className="font-medium hover:underline">
                                                    {log.tenant.name}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{log.impersonated_user?.name ?? '—'}</p>
                                            <p className="text-xs text-muted-foreground">{log.impersonated_user?.email}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            {log.ended_at ? (
                                                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                    Cerrada · {formatDateTime(log.ended_at)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                                    <ShieldAlert className="h-3 w-3" />
                                                    En curso
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-muted-foreground">{log.ip_address ?? '—'}</td>
                                    </tr>
                                ))}
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            Sin registros todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationFooter data={{ ...logs, resourceLabel: 'registros' }} />
                </div>
            </div>
        </AppLayout>
    );
}
