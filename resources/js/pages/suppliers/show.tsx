import PaginationFooter from '@/components/common/PaginationFooter';
import { useConfirm } from '@/components/confirm-dialog';
import { INPUT_CLASS, Section } from '@/components/sales/form-fields';
import { MovementTypePill, signedQuantity } from '@/components/stock/stock-meta';
import { SupplierAvatar, SupplierStatusPill } from '@/components/suppliers/supplier-list';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type StockMovement, type Supplier, type SupplierProduct } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Trash2, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface PaginatedMovements {
    data: StockMovement[];
    links: { label: string; url: string | null }[];
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
}

interface PageProps {
    supplier: Supplier & { products: SupplierProduct[] };
    movements: PaginatedMovements;
    totalCost: number;
    filters: { start_date?: string; end_date?: string };
}

const ACTION =
    'flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:h-10';

function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-2xl border border-border/60 bg-card p-4', className)}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{children}</p>
        </div>
    );
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-muted-foreground/60" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium break-words">{children}</dd>
            </div>
        </div>
    );
}

const HEAD = 'px-3 py-3 font-medium';

export default function Show({ supplier, movements, totalCost, filters }: PageProps) {
    const { confirm, dialog } = useConfirm();
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate] = useState(filters.end_date ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Proveedores', href: '/suppliers' },
        { title: supplier.name, href: `/suppliers/${supplier.id}` },
    ];

    const handleDelete = async () => {
        const accepted = await confirm({
            title: `¿Eliminar al proveedor "${supplier.name}"?`,
            description: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Eliminar',
        });

        if (accepted) {
            router.delete(route('suppliers.destroy', supplier.id));
        }
    };

    const applyDateFilter = () => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        router.visit(`/suppliers/${supplier.id}?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['movements', 'totalCost', 'filters'],
        });
    };

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
        router.visit(`/suppliers/${supplier.id}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['movements', 'totalCost', 'filters'],
        });
    };

    const products = supplier.products ?? [];
    const productLink = (id: number, name: string) => (
        <Link href={route('products.show', id)} className="font-medium hover:underline">
            {name}
        </Link>
    );
    const hasContact = supplier.contact_name || supplier.phone || supplier.email || supplier.address || supplier.branch;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Proveedor: ${supplier.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('suppliers.index')}
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <SupplierAvatar name={supplier.name} className="hidden sm:flex" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Detalle del Proveedor</p>
                        <h1 className="text-xl leading-tight font-bold break-words sm:text-2xl">{supplier.name}</h1>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            {supplier.nit && <span className="font-mono">NIT: {supplier.nit}</span>}
                            <span>Registrado {formatDate(supplier.created_at)}</span>
                            <SupplierStatusPill active={supplier.status} className="px-2 py-0.5" />
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                    <Link
                        href={route('suppliers.edit', supplier.id)}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                    </Link>
                    {supplier.phone && (
                        <a href={`tel:${supplier.phone}`} className={ACTION}>
                            <Phone className="size-4" aria-hidden="true" />
                            Llamar
                        </a>
                    )}
                    {supplier.email && (
                        <a href={`mailto:${supplier.email}`} className={ACTION}>
                            <Mail className="size-4" aria-hidden="true" />
                            Escribir
                        </a>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDelete}
                        className="h-11 gap-2 rounded-xl border-red-200 px-4 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-10 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Eliminar
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label="Productos vinculados">{products.length}</Stat>
                    <Stat label="Movimientos">{movements.total}</Stat>
                    {totalCost > 0 && (
                        <Stat label="Total compras" className="col-span-2 sm:col-span-1">
                            {formatCurrency(totalCost)}
                        </Stat>
                    )}
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="flex flex-col gap-5">
                        <Section
                            title="Productos vinculados"
                            description={
                                products.length
                                    ? `${products.length} producto(s) asociado(s) a este proveedor`
                                    : 'Ningún producto asociado aún — vincúlalos desde Editar Producto'
                            }
                        >
                            {products.length === 0 ? (
                                <p className="px-5 pb-5 text-sm text-muted-foreground">
                                    Sin productos. Asocia productos desde la página de edición de cada producto.
                                </p>
                            ) : isWide ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-y border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                                <th scope="col" className="px-5 py-3 font-medium">
                                                    Producto
                                                </th>
                                                <th scope="col" className={HEAD}>
                                                    Código
                                                </th>
                                                <th scope="col" className={HEAD}>
                                                    Cód. Proveedor
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'text-right')}>
                                                    P. compra (proveedor)
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'text-right')}>
                                                    Stock
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'pr-5')}>
                                                    Predeterminado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {products.map((p) => (
                                                <tr key={p.id} className="hover:bg-muted/40">
                                                    <td className="px-5 py-3">{productLink(p.id, p.name)}</td>
                                                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                                                    <td className="px-3 py-3 text-muted-foreground">{p.pivot.supplier_code || '-'}</td>
                                                    <td className="px-3 py-3 text-right tabular-nums">
                                                        {p.pivot.purchase_price != null ? formatCurrency(Number(p.pivot.purchase_price)) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums">{p.stock}</td>
                                                    <td className="px-3 py-3 pr-5">
                                                        {p.pivot.is_default ? (
                                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                Sí
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/40 border-t border-border/60">
                                    {products.map((p) => (
                                        <li key={p.id} className="flex items-start justify-between gap-3 px-5 py-3">
                                            <div className="min-w-0 flex-1">
                                                {productLink(p.id, p.name)}
                                                <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                                                {p.pivot.purchase_price != null && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        Compra: {formatCurrency(Number(p.pivot.purchase_price))}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <span className="text-xs font-medium tabular-nums">Stock: {p.stock}</span>
                                                {p.pivot.is_default ? (
                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        Predeterminado
                                                    </span>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <Section title="Historial de movimientos" description="Movimientos de stock vinculados a este proveedor">
                            <div className="flex flex-wrap items-end gap-3 px-5 pb-4">
                                <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                                    <label htmlFor="start-date" className="text-xs text-muted-foreground">
                                        Desde
                                    </label>
                                    <input
                                        id="start-date"
                                        type="date"
                                        className={INPUT_CLASS}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                                    <label htmlFor="end-date" className="text-xs text-muted-foreground">
                                        Hasta
                                    </label>
                                    <input
                                        id="end-date"
                                        type="date"
                                        className={INPUT_CLASS}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={applyDateFilter}
                                    className="h-11 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:opacity-90 sm:h-9"
                                    style={{ color: onBrand.hex }}
                                >
                                    Filtrar
                                </Button>
                                {(filters.start_date || filters.end_date) && (
                                    <Button type="button" variant="ghost" onClick={clearFilter} className="h-11 text-muted-foreground sm:h-9">
                                        Limpiar
                                    </Button>
                                )}
                            </div>

                            {movements.data.length === 0 ? (
                                <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
                                    Sin movimientos registrados con este proveedor.
                                </p>
                            ) : isWide ? (
                                <div className="overflow-x-auto border-t border-border/60">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                                <th scope="col" className="px-5 py-3 font-medium">
                                                    Fecha
                                                </th>
                                                <th scope="col" className={HEAD}>
                                                    Tipo
                                                </th>
                                                <th scope="col" className={HEAD}>
                                                    Producto
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'text-right')}>
                                                    Cant.
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'text-right')}>
                                                    Costo unit.
                                                </th>
                                                <th scope="col" className={cn(HEAD, 'pr-5')}>
                                                    Referencia
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {movements.data.map((m) => (
                                                <tr key={m.id} className="hover:bg-muted/40">
                                                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                                                        {formatDate(m.movement_date)}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <MovementTypePill type={m.type} />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {m.product ? (
                                                            <Link href={route('products.show', m.product_id)} className="hover:underline">
                                                                {m.product.name}
                                                            </Link>
                                                        ) : (
                                                            `#${m.product_id}`
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                                                        {signedQuantity(m.type, m.quantity)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums">
                                                        {m.unit_cost != null ? formatCurrency(Number(m.unit_cost)) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 pr-5">{m.reference || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/40 border-t border-border/60">
                                    {movements.data.map((m) => (
                                        <li key={m.id} className="flex flex-col gap-1.5 px-5 py-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">{formatDate(m.movement_date)}</span>
                                                <MovementTypePill type={m.type} className="px-2 py-0.5" />
                                            </div>
                                            <div className="flex items-baseline justify-between gap-2">
                                                <p className="min-w-0 font-medium">
                                                    {m.product ? (
                                                        <Link href={route('products.show', m.product_id)} className="hover:underline">
                                                            {m.product.name}
                                                        </Link>
                                                    ) : (
                                                        `#${m.product_id}`
                                                    )}
                                                </p>
                                                <span className="shrink-0 font-bold tabular-nums">{signedQuantity(m.type, m.quantity)}</span>
                                            </div>
                                            {(m.unit_cost != null || m.reference) && (
                                                <p className="text-xs text-muted-foreground">
                                                    {m.unit_cost != null && <>Costo: {formatCurrency(Number(m.unit_cost))}</>}
                                                    {m.unit_cost != null && m.reference && ' · '}
                                                    {m.reference}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <PaginationFooter data={{ ...movements, resourceLabel: 'movimientos' }} />
                        </Section>
                    </div>

                    <div className="flex flex-col gap-5">
                        {hasContact && (
                            <Section title="Contacto">
                                <dl className="flex flex-col gap-4 px-5 pb-5">
                                    {supplier.contact_name && (
                                        <Info icon={<User className="size-4" />} label="Contacto">
                                            {supplier.contact_name}
                                        </Info>
                                    )}
                                    {supplier.phone && (
                                        <Info icon={<Phone className="size-4" />} label="Teléfono">
                                            {supplier.phone}
                                        </Info>
                                    )}
                                    {supplier.email && (
                                        <Info icon={<Mail className="size-4" />} label="Correo">
                                            {supplier.email}
                                        </Info>
                                    )}
                                    {supplier.address && (
                                        <Info icon={<MapPin className="size-4" />} label="Dirección">
                                            {supplier.address}
                                        </Info>
                                    )}
                                    {supplier.branch && (
                                        <Info icon={<span className="block size-4" />} label="Sucursal">
                                            {supplier.branch.name}
                                        </Info>
                                    )}
                                </dl>
                            </Section>
                        )}
                        {supplier.notes && (
                            <Section title="Notas">
                                <p className="px-5 pb-5 text-sm whitespace-pre-wrap">{supplier.notes}</p>
                            </Section>
                        )}
                    </div>
                </div>
            </div>
            {dialog}
        </AppLayout>
    );
}
