import { BACK_BUTTON, OUTLINE_ACTION, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/admin/styles';
import { initialsOf } from '@/components/admin/tenant-badges';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Archive, ArchiveRestore, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface ArchivedTenant {
    id: number;
    name: string;
    slug: string;
    deleted_at: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Negocios', href: '/admin/tenants' },
    { title: 'Archivados', href: '/admin/tenants/archived' },
];

function RestoreButton({ tenant, onRestore }: { tenant: ArchivedTenant; onRestore: (tenant: ArchivedTenant) => void }) {
    return (
        <button onClick={() => onRestore(tenant)} aria-label={`Restaurar ${tenant.name}`} className={OUTLINE_ACTION}>
            <ArchiveRestore className="h-4 w-4 sm:h-3 sm:w-3" />
            Restaurar
        </button>
    );
}

export default function TenantsArchived({ tenants }: { tenants: ArchivedTenant[] }) {
    const [restoreTarget, setRestoreTarget] = useState<ArchivedTenant | null>(null);

    const confirmRestore = () => {
        if (!restoreTarget) return;
        router.post(`/admin/tenants/${restoreTarget.id}/restore`, {}, { preserveScroll: true, onFinish: () => setRestoreTarget(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Negocios archivados" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link href="/admin/tenants" aria-label="Volver a negocios" className={BACK_BUTTON}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl leading-tight font-bold">Negocios archivados</h1>
                        <p className="text-xs text-muted-foreground">Eliminados de forma reversible — sus datos se conservan.</p>
                    </div>
                </div>

                {tenants.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
                        <Archive className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-medium">No hay negocios archivados.</p>
                        <p className="text-xs text-muted-foreground">Cuando elimines un negocio aparecerá aquí para poder restaurarlo.</p>
                    </div>
                ) : (
                    <>
                        <ul
                            aria-label={`${tenants.length} negocio(s) archivado(s)`}
                            className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card md:hidden"
                        >
                            {tenants.map((t) => (
                                <li key={t.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground"
                                        >
                                            {initialsOf(t.name)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] leading-tight font-semibold">{t.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{t.slug}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Archivado el {formatDateOnly(t.deleted_at)}</p>
                                        </div>
                                    </div>
                                    <RestoreButton tenant={t} onRestore={setRestoreTarget} />
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                        <th className="px-6 py-2.5 font-medium">Negocio</th>
                                        <th className="px-3 py-2.5 font-medium">Archivado</th>
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
                                            <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateOnly(t.deleted_at)}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end">
                                                    <RestoreButton tenant={t} onRestore={setRestoreTarget} />
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

            <Dialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restaurar negocio</DialogTitle>
                        <DialogDescription>¿Restaurar «{restoreTarget?.name}»? Sus usuarios recuperarán el acceso.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button onClick={() => setRestoreTarget(null)} className={SECONDARY_BUTTON}>
                            Cancelar
                        </button>
                        <button onClick={confirmRestore} className={PRIMARY_BUTTON}>
                            Restaurar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
