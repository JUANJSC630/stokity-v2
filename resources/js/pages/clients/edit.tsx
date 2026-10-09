import { StickyActions } from '@/components/admin/sticky-actions';
import { ClientFormFields } from '@/components/clients/client-form-fields';
import { HoldToConfirm } from '@/components/ui/arc/hold-to-confirm';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Client {
    id: number;
    name: string;
    document: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    birthdate: string | null;
    is_wholesale: boolean;
    wholesale_discount_pct: string | null;
}

interface Props {
    client: Client;
}

export default function Edit({ client }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Clientes',
            href: '/clients',
        },
        {
            title: client.name,
            href: `/clients/${client.id}`,
        },
        {
            title: 'Editar',
            href: `/clients/${client.id}/edit`,
        },
    ];

    const { can } = usePermissions();
    const onBrand = useOnBrandColor();
    const canManageWholesale = can('clients.wholesale.manage');

    const form = useForm({
        name: client.name,
        document: client.document,
        phone: client.phone || '',
        address: client.address || '',
        email: client.email || '',
        birthdate: client.birthdate || '',
        is_wholesale: client.is_wholesale,
        wholesale_discount_pct: client.wholesale_discount_pct || '',
    });

    useScrollToError(form.errors);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put(route('clients.update', client.id));
    }

    function handleDelete() {
        router.delete(route('clients.destroy', client.id));
        setIsDeleteDialogOpen(false);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar cliente: ${client.name}`} />
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('clients.show', client.id)}
                        aria-label="Volver al cliente"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl leading-tight font-bold sm:text-2xl">Editar cliente</h1>
                        <p className="truncate text-sm text-muted-foreground">{client.name}</p>
                    </div>
                </div>

                <ClientFormFields data={form.data} errors={form.errors} setData={form.setData as never} canManageWholesale={canManageWholesale} />

                <StickyActions>
                    <button
                        type="button"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        aria-label="Eliminar cliente"
                        className="mr-auto flex h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-card px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-9 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Eliminar</span>
                    </button>
                    <Link
                        href={route('clients.show', client.id)}
                        className="flex h-11 items-center justify-center rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9"
                        style={{ color: onBrand.hex }}
                    >
                        <Save className="size-4" aria-hidden="true" />
                        Actualizar cliente
                    </button>
                </StickyActions>
            </form>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar cliente</DialogTitle>
                        <DialogDescription>
                            ¿Seguro que quieres eliminar a {client.name}? Esta acción no se puede deshacer. Mantén pulsado el botón para confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:h-9"
                        >
                            Cancelar
                        </button>
                        <HoldToConfirm
                            label="Mantén para eliminar"
                            confirmedLabel="Eliminando…"
                            tone="danger"
                            onConfirm={handleDelete}
                            className="w-full sm:w-auto"
                        />
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
