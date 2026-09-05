import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArchiveRestore, ChevronLeft } from 'lucide-react';
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

export default function TenantsArchived({ tenants }: { tenants: ArchivedTenant[] }) {
    const [restoreTarget, setRestoreTarget] = useState<ArchivedTenant | null>(null);

    const confirmRestore = () => {
        if (!restoreTarget) return;
        router.post(`/admin/tenants/${restoreTarget.id}/restore`, {}, { preserveScroll: true, onFinish: () => setRestoreTarget(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Negocios archivados" />
            <div className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/tenants"
                        aria-label="Volver a negocios"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Negocios archivados</h1>
                        <p className="text-xs text-muted-foreground">Eliminados de forma reversible — sus datos se conservan.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="overflow-x-auto">
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
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{t.deleted_at}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => setRestoreTarget(t)}
                                                className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <ArchiveRestore className="h-3 w-3" />
                                                Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tenants.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            No hay negocios archivados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restaurar negocio</DialogTitle>
                        <DialogDescription>¿Restaurar «{restoreTarget?.name}»? Sus usuarios recuperarán el acceso.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            onClick={() => setRestoreTarget(null)}
                            className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmRestore}
                            className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Restaurar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
