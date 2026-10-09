import { StickyActions } from '@/components/admin/sticky-actions';
import { ClientFormFields } from '@/components/clients/client-form-fields';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
    {
        title: 'Crear cliente',
        href: '/clients/create',
    },
];

export function CardCreateClient({
    onSuccess,
    onCancel,
    variant = 'default',
    sticky = false,
}: {
    onSuccess?: () => void;
    onCancel?: () => void;
    /**
     * 'wholesale' is used from WholesaleOrderForm's "crear cliente" dialog —
     * a lighter version of this same shared form: no email (mayoristas de Lu
     * Accesorios lo piden por ciudad, no por correo), "Dirección" relabeled
     * "Ciudad" (reuses the same `address` column — no separate city field
     * exists), and no "Cliente mayorista" toggle (this dialog just attaches
     * a client to a wholesale order; it doesn't mean the client itself
     * should get the wholesale pricing flag). The plain Clientes page and
     * the POS "crear cliente" modal keep the full 'default' form.
     */
    variant?: 'default' | 'wholesale';
    /** Keep the actions in view above the phone bottom bar (full page); dialogs keep them in the flow. */
    sticky?: boolean;
}) {
    const onBrand = useOnBrandColor();
    const { can } = usePermissions();
    const isWholesaleVariant = variant === 'wholesale';
    const canManageWholesale = !isWholesaleVariant && can('clients.wholesale.manage');

    const form = useForm<{
        name: string;
        document: string;
        phone: string;
        address: string;
        email: string;
        birthdate: string;
        is_wholesale: boolean;
        wholesale_discount_pct: string;
    }>({
        name: '',
        document: '',
        phone: '',
        address: '',
        email: '',
        birthdate: '',
        is_wholesale: false,
        wholesale_discount_pct: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('clients.store'), {
            onSuccess: () => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.visit(route('clients.index'));
                }
            },
        });
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.visit(route('clients.index'));
        }
    };

    const actions = (
        <>
            <button
                type="button"
                onClick={handleCancel}
                className="flex h-11 items-center justify-center rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9"
            >
                Cancelar
            </button>
            <button
                type="submit"
                disabled={form.processing}
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9"
                style={{ color: onBrand.hex }}
            >
                <Save className="size-4" aria-hidden="true" />
                Guardar cliente
            </button>
        </>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <ClientFormFields
                data={form.data}
                errors={form.errors}
                setData={form.setData as never}
                simplified={isWholesaleVariant}
                canManageWholesale={canManageWholesale}
            />
            {sticky ? <StickyActions>{actions}</StickyActions> : <div className="flex items-center justify-end gap-2">{actions}</div>}
        </form>
    );
}

export default function Create() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear cliente" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('clients.index')}
                        aria-label="Volver a clientes"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl leading-tight font-bold sm:text-2xl">Nuevo cliente</h1>
                        <p className="text-sm text-muted-foreground">Los campos con * son obligatorios.</p>
                    </div>
                </div>
                <CardCreateClient sticky />
            </div>
        </AppLayout>
    );
}
