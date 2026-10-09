import { initialsOf } from '@/components/admin/tenant-badges';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SaleStatusPill } from '@/components/sales/sale-status';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Mail, MapPin, Pencil, Phone, ShoppingBag, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';

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
    created_at: string;
    updated_at: string;
}

interface Sale {
    id: number;
    code: string;
    total: number;
    discount_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    seller?: { name: string } | null;
}

interface PaginatedSales {
    data: Sale[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Stats {
    total_sales: number;
    total_spent: number;
    last_purchase: string | null;
}

interface Props {
    client: Client;
    sales: PaginatedSales;
    stats: Stats;
}

const formatCount = (value: number): string => String(value);

const ACTION =
    'flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:h-9 sm:rounded-lg sm:text-xs';

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

export default function Show({ client, sales, stats }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const fromSale = searchParams ? searchParams.get('fromSale') : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clientes', href: '/clients' },
        { title: client.name, href: `/clients/${client.id}` },
    ];

    function handleDelete() {
        router.delete(route('clients.destroy', client.id));
        setIsDeleteDialogOpen(false);
    }

    const backHref = fromSale ? route('sales.show', fromSale) : route('clients.index');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente: ${client.name}`} />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={backHref}
                        aria-label={fromSale ? 'Volver a la venta' : 'Volver a clientes'}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <span
                        aria-hidden="true"
                        className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)] sm:flex"
                    >
                        {initialsOf(client.name) || '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl leading-tight font-bold break-words">{client.name}</h1>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>Cliente desde {formatDate(client.created_at)}</span>
                            {client.is_wholesale && (
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                    Mayorista · {Number(client.wholesale_discount_pct)}% dto.
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                    <Link href={route('clients.edit', client.id)} className={ACTION}>
                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        Editar
                    </Link>
                    {client.phone && (
                        <a href={`tel:${client.phone}`} className={ACTION}>
                            <Phone className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            Llamar
                        </a>
                    )}
                    {client.email && (
                        <a href={`mailto:${client.email}`} className={ACTION}>
                            <Mail className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            Escribir
                        </a>
                    )}
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
                    <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
                        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                            <div className="flex items-center gap-1.5 px-5 pt-4 pb-3">
                                <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Historial de compras
                                    {sales.total > 0 && <span className="ml-1.5 text-muted-foreground/60">({sales.total})</span>}
                                </h2>
                            </div>

                            {sales.data.length === 0 ? (
                                <p className="px-5 pb-8 text-center text-sm text-muted-foreground">Sin ventas registradas</p>
                            ) : (
                                <>
                                    <table className="hidden w-full text-sm md:table">
                                        <caption className="sr-only">Historial de compras</caption>
                                        <thead>
                                            <tr className="border-y border-border/40 bg-muted/20 text-[11px] tracking-wide text-muted-foreground uppercase">
                                                <th scope="col" className="px-5 py-2.5 text-left font-medium">
                                                    Venta
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                                                    Fecha
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                                                    Vendedor
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                                    Dcto.
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                                    Total
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                                                    Estado
                                                </th>
                                                <th scope="col" className="w-12 px-5 py-2.5">
                                                    <span className="sr-only">Ver</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {sales.data.map((sale) => (
                                                <tr
                                                    key={sale.id}
                                                    onClick={() => router.visit(route('sales.show', sale.id))}
                                                    className="cursor-pointer transition-colors hover:bg-muted/30"
                                                >
                                                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{sale.code}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(sale.created_at)}</td>
                                                    <td className="px-3 py-3 text-muted-foreground">{sale.seller?.name ?? '—'}</td>
                                                    <td className="px-3 py-3 text-right text-red-500 tabular-nums dark:text-red-400">
                                                        {sale.discount_amount > 0 ? `−${formatCurrency(sale.discount_amount)}` : '—'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(sale.total)}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <SaleStatusPill status={sale.status} />
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <Link
                                                            href={route('sales.show', sale.id)}
                                                            onClick={(event) => event.stopPropagation()}
                                                            aria-label={`Ver venta ${sale.code}`}
                                                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <ChevronRight className="size-4" aria-hidden="true" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <ul className="divide-y divide-border/40 border-t border-border/60 md:hidden">
                                        {sales.data.map((sale, index) => (
                                            <li key={sale.id}>
                                                <StaggerItem index={index}>
                                                    <Link
                                                        href={route('sales.show', sale.id)}
                                                        className="flex min-h-16 items-center gap-3 px-5 py-3 active:bg-muted/40"
                                                    >
                                                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                                                            <span className="flex items-baseline justify-between gap-2">
                                                                <span className="truncate font-mono text-xs text-muted-foreground">{sale.code}</span>
                                                                <span className="shrink-0 text-base font-bold tabular-nums">
                                                                    {formatCurrency(sale.total)}
                                                                </span>
                                                            </span>
                                                            <span className="flex items-center justify-between gap-2">
                                                                <SaleStatusPill status={sale.status} />
                                                                <span className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</span>
                                                            </span>
                                                        </span>
                                                        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                                                    </Link>
                                                </StaggerItem>
                                            </li>
                                        ))}
                                    </ul>

                                    <PaginationFooter data={{ ...sales, from: sales.from ?? 0, to: sales.to ?? 0, resourceLabel: 'ventas' }} />
                                </>
                            )}
                        </section>
                    </div>

                    <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
                        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
                            <div className="rounded-2xl border border-border/60 bg-card px-3 py-3 lg:px-5 lg:py-4">
                                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Compras</p>
                                <p className="mt-1.5 text-2xl leading-none font-bold tabular-nums">
                                    <RollingNumber value={stats.total_sales} format={formatCount} intro />
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-card px-3 py-3 lg:px-5 lg:py-4">
                                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Facturado</p>
                                <p className="mt-1.5 truncate text-base leading-none font-bold tabular-nums lg:text-2xl">
                                    <RollingNumber value={stats.total_spent} format={formatCurrency} intro />
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-card px-3 py-3 lg:px-5 lg:py-4">
                                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Última compra</p>
                                <p className="mt-1.5 text-sm leading-tight font-semibold lg:text-base">
                                    {stats.last_purchase ? formatDate(stats.last_purchase) : '—'}
                                </p>
                            </div>
                        </div>

                        <section className="rounded-2xl border border-border/60 bg-card">
                            <h2 className="px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Información</h2>
                            <dl className="flex flex-col gap-4 px-5 pb-5">
                                <Info icon={<User className="size-4" />} label="Documento">
                                    {client.document}
                                </Info>
                                <Info icon={<Phone className="size-4" />} label="Teléfono">
                                    {client.phone || '—'}
                                </Info>
                                <Info icon={<Mail className="size-4" />} label="Correo">
                                    {client.email || '—'}
                                </Info>
                                <Info icon={<MapPin className="size-4" />} label="Dirección">
                                    {client.address || '—'}
                                </Info>
                                <Info icon={<CalendarDays className="size-4" />} label="Nacimiento">
                                    {client.birthdate ? formatDate(client.birthdate) : '—'}
                                </Info>
                            </dl>
                        </section>
                    </div>
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar cliente</DialogTitle>
                        <DialogDescription>¿Estás seguro de que deseas eliminar a {client.name}? Esta acción no se puede deshacer.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:h-9"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:opacity-90 sm:h-9"
                        >
                            Eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
