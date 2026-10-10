import { SupplierForm } from '@/components/suppliers/supplier-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Supplier } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
    supplier: Supplier;
    branches: Branch[];
}

export default function Edit({ supplier, branches }: PageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Proveedores', href: '/suppliers' },
        { title: supplier.name, href: `/suppliers/${supplier.id}` },
        { title: 'Editar', href: `/suppliers/${supplier.id}/edit` },
    ];

    const form = useForm<{
        branch_id: string;
        name: string;
        nit: string;
        contact_name: string;
        phone: string;
        email: string;
        address: string;
        notes: string;
        status: boolean;
    }>({
        branch_id: String(supplier.branch_id),
        name: supplier.name,
        nit: supplier.nit ?? '',
        contact_name: supplier.contact_name ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
        status: supplier.status,
    });

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(route('suppliers.update', supplier.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Proveedor: ${supplier.name}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('suppliers.show', supplier.id)}
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Editar Proveedor</h1>
                        <p className="truncate text-sm text-muted-foreground">{supplier.name}</p>
                    </div>
                </div>

                <SupplierForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    branches={branches}
                    submitLabel="Guardar Cambios"
                    cancelHref={route('suppliers.show', supplier.id)}
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
