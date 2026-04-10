import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, Mail, MapPin, Pencil, Phone, Receipt, ShoppingBag, User } from 'lucide-react';
import { useState } from 'react';

interface Client {
    id: number;
    name: string;
    document: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    birthdate: string | null;
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

function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    completed: {
        label: 'Completada',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    pending: {
        label: 'Pendiente',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    },
    cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' },
};

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente: ${client.name}`} />
            <div className="flex h-full flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {fromSale ? (
                            <button
                                onClick={() => (window.location.href = `/sales/${fromSale}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        ) : (
                            <Link
                                href={route('clients.index')}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Link>
                        )}
                        <div>
                            <h1 className="text-xl leading-tight font-bold">{client.name}</h1>
                            <p className="text-xs text-muted-foreground">Desde {new Date(client.created_at).toLocaleDateString('es-CO')}</p>
                        </div>
                    </div>
                    <Link href={route('clients.edit', client.id)}>
                        <button className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                            Editar
                        </button>
                    </Link>
                </div>

                {/* Info + Stats row */}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    {/* Client info card */}
                    <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
                        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Información</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                            <div className="flex items-start gap-2">
                                <User className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Documento</p>
                                    <p className="truncate text-xs font-medium">{client.document}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Teléfono</p>
                                    <p className="truncate text-xs font-medium">{client.phone || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Correo</p>
                                    <p className="truncate text-xs font-medium">{client.email || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Dirección</p>
                                    <p className="truncate text-xs font-medium">{client.address || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Nacimiento</p>
                                    <p className="truncate text-xs font-medium">
                                        {client.birthdate ? new Date(client.birthdate).toLocaleDateString('es-CO') : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats — row on mobile (grid), column on desktop */}
                    <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-3">
                        <div className="rounded-xl border border-border/60 bg-card px-2 py-2.5 lg:min-w-[160px] lg:px-4 lg:py-3">
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase lg:text-[11px]">Compras</p>
                            <p className="mt-1 text-xl leading-none font-bold tabular-nums lg:mt-1.5 lg:text-2xl">{stats.total_sales}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card px-2 py-2.5 lg:px-4 lg:py-3">
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase lg:text-[11px]">Facturado</p>
                            <p className="mt-1 truncate text-sm leading-none font-bold tabular-nums lg:mt-1.5 lg:text-lg">{formatCOP(stats.total_spent)}</p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card px-2 py-2.5 lg:px-4 lg:py-3">
                            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase lg:text-[11px]">Última compra</p>
                            <p className="mt-1 text-xs leading-none font-semibold lg:mt-1.5 lg:text-sm">
                                {stats.last_purchase ? new Date(stats.last_purchase).toLocaleDateString('es-CO') : '—'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Purchase history */}
                <div className="rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center gap-1.5 px-5 py-4">
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Historial de compras
                            {sales.total > 0 && <span className="ml-1.5 text-muted-foreground/60">({sales.total})</span>}
                        </p>
                    </div>

                    {sales.data.length === 0 ? (
                        <p className="px-5 pb-6 text-center text-sm text-muted-foreground">Sin ventas registradas</p>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden border-t border-border/60 md:block">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/40 bg-muted/20">
                                            <th className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Código
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Fecha
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Vendedor
                                            </th>
                                            <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Dcto.
                                            </th>
                                            <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Total
                                            </th>
                                            <th className="px-4 py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                                Estado
                                            </th>
                                            <th className="px-4 py-2.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.data.map((sale, idx) => {
                                            const status = STATUS_MAP[sale.status] ?? {
                                                label: sale.status,
                                                className: 'bg-muted text-muted-foreground border-border',
                                            };
                                            return (
                                                <tr
                                                    key={sale.id}
                                                    className={`transition-colors hover:bg-muted/30 ${idx !== 0 ? 'border-t border-border/40' : ''}`}
                                                >
                                                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{sale.code}</td>
                                                    <td className="px-4 py-2.5 text-xs">{new Date(sale.created_at).toLocaleDateString('es-CO')}</td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{sale.seller?.name ?? '—'}</td>
                                                    <td className="px-4 py-2.5 text-right text-xs text-red-500 dark:text-red-400">
                                                        {sale.discount_amount > 0 ? `−${formatCOP(sale.discount_amount)}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums">
                                                        {formatCOP(sale.total)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span
                                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <Link
                                                            href={route('sales.show', sale.id)}
                                                            className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                                                        >
                                                            <Receipt className="h-3 w-3" />
                                                            Ver
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="divide-y divide-border/40 border-t border-border/60 md:hidden">
                                {sales.data.map((sale) => {
                                    const status = STATUS_MAP[sale.status] ?? {
                                        label: sale.status,
                                        className: 'bg-muted text-muted-foreground border-border',
                                    };
                                    return (
                                        <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-mono text-[11px] text-muted-foreground">{sale.code}</span>
                                                <span className="text-xs font-semibold tabular-nums">{formatCOP(sale.total)}</span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {new Date(sale.created_at).toLocaleDateString('es-CO')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
                                                    {status.label}
                                                </span>
                                                <Link
                                                    href={route('sales.show', sale.id)}
                                                    className="text-[11px] text-muted-foreground hover:text-foreground"
                                                >
                                                    Ver
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {sales.last_page > 1 && (() => {
                                const pageLinks = sales.links.filter((l) => {
                                    const clean = l.label.replace(/&laquo;|&raquo;/g, '').trim();
                                    return !isNaN(Number(clean));
                                });
                                const prevLink = sales.links.find((l) => l.label.includes('laquo') || l.label === '&laquo; Previous');
                                const nextLink = sales.links.find((l) => l.label.includes('raquo') || l.label === 'Next &raquo;');
                                const cur = sales.current_page;
                                const last = sales.last_page;
                                // Window of 5 centered on current page
                                const idx = cur - 1;
                                const start = Math.max(0, Math.min(idx - 2, pageLinks.length - 5));
                                const window5 = pageLinks.slice(start, start + 5);
                                return (
                                    <div className="flex flex-col items-center gap-2 border-t border-border/40 px-5 py-3 sm:flex-row sm:justify-between">
                                        <p className="text-[11px] text-muted-foreground">
                                            {sales.from}–{sales.to} de {sales.total}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            {prevLink?.url && (
                                                <Link href={prevLink.url} preserveScroll>
                                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">«</Button>
                                                </Link>
                                            )}
                                            {start > 0 && (
                                                <>
                                                    <Link href={pageLinks[0].url!} preserveScroll>
                                                        <Button variant={cur === 1 ? 'default' : 'outline'} size="sm" className="h-7 min-w-7 px-2 text-xs">1</Button>
                                                    </Link>
                                                    {start > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                                                </>
                                            )}
                                            {window5.map((link, i) => (
                                                link.url ? (
                                                    <Link key={i} href={link.url} preserveScroll>
                                                        <Button variant={link.active ? 'default' : 'outline'} size="sm" className="h-7 min-w-7 px-2 text-xs">
                                                            {link.label}
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button key={i} variant="default" size="sm" className="h-7 min-w-7 px-2 text-xs" disabled>
                                                        {link.label}
                                                    </Button>
                                                )
                                            ))}
                                            {start + 5 < pageLinks.length && (
                                                <>
                                                    {start + 5 < pageLinks.length - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                                                    <Link href={pageLinks[pageLinks.length - 1].url!} preserveScroll>
                                                        <Button variant={cur === last ? 'default' : 'outline'} size="sm" className="h-7 min-w-7 px-2 text-xs">{last}</Button>
                                                    </Link>
                                                </>
                                            )}
                                            {nextLink?.url && (
                                                <Link href={nextLink.url} preserveScroll>
                                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">»</Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Cliente</DialogTitle>
                        <DialogDescription>¿Estás seguro de que deseas eliminar a {client.name}? Esta acción no se puede deshacer.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
