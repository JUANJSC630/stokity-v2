import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { type BreadcrumbItem, type StockMovement, type Supplier, type SupplierProduct } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

const TYPE_LABELS: Record<string, string> = {
    ingreso: 'Ingreso',
    out: 'Salida',
    adjustment: 'Ajuste',
    write_off: 'Baja',
    supplier_return: 'Dev. a proveedor',
};

const TYPE_COLORS: Record<string, string> = {
    ingreso: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    out: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    write_off: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    supplier_return: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function Show({ supplier, movements, totalCost, filters }: PageProps) {
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate] = useState(filters.end_date ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Proveedores', href: '/suppliers' },
        { title: supplier.name, href: `/suppliers/${supplier.id}` },
    ];

    const handleDelete = () => {
        if (confirm(`¿Eliminar al proveedor "${supplier.name}"? Esta acción no se puede deshacer.`)) {
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

    const productColumns: Column<SupplierProduct & { actions: null }>[] = [
        {
            key: 'name',
            title: 'Producto',
            render: (_: unknown, row: SupplierProduct) => (
                <Link href={route('products.show', row.id)} className="font-medium hover:underline">
                    {row.name}
                </Link>
            ),
        },
        { key: 'code', title: 'Código' },
        {
            key: 'pivot' as keyof SupplierProduct,
            title: 'Cód. Proveedor',
            render: (_: unknown, row: SupplierProduct) => row.pivot.supplier_code || '-',
        },
        {
            key: 'sale_price',
            title: 'P. compra (proveedor)',
            render: (_: unknown, row: SupplierProduct) =>
                row.pivot.purchase_price != null ? `$ ${Number(row.pivot.purchase_price).toLocaleString('es-CO')}` : '-',
        },
        { key: 'stock', title: 'Stock' },
        {
            key: 'actions',
            title: 'Predeterminado',
            render: (_: unknown, row: SupplierProduct) =>
                row.pivot.is_default ? (
                    <Badge className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">Sí</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
    ];

    const movementColumns: Column<StockMovement & { actions: null }>[] = [
        {
            key: 'movement_date',
            title: 'Fecha',
            render: (_: unknown, row: StockMovement) => formatDate(row.movement_date),
        },
        {
            key: 'type',
            title: 'Tipo',
            render: (_: unknown, row: StockMovement) => (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[row.type] ?? 'bg-gray-100 text-gray-800'}`}>
                    {TYPE_LABELS[row.type] ?? row.type}
                </span>
            ),
        },
        {
            key: 'product_id',
            title: 'Producto',
            render: (_: unknown, row: StockMovement) =>
                row.product ? (
                    <Link href={route('products.show', row.product_id)} className="hover:underline">
                        {row.product.name}
                    </Link>
                ) : (
                    `#${row.product_id}`
                ),
        },
        { key: 'quantity', title: 'Cant.' },
        {
            key: 'unit_cost',
            title: 'Costo unit.',
            render: (_: unknown, row: StockMovement) => (row.unit_cost != null ? `$ ${Number(row.unit_cost).toLocaleString('es-CO')}` : '-'),
        },
        {
            key: 'reference',
            title: 'Referencia',
            render: (_: unknown, row: StockMovement) => row.reference || '-',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Proveedor: ${supplier.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-2xl font-semibold">Detalle del Proveedor</h1>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('suppliers.index')}>
                            <Button variant="outline" size="sm" className="gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Volver</span>
                            </Button>
                        </Link>
                        <Link href={route('suppliers.edit', supplier.id)}>
                            <Button variant="outline" size="sm" className="gap-1">
                                <Edit2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Editar</span>
                            </Button>
                        </Link>
                        <Button variant="destructive" size="sm" className="gap-1" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                    </div>
                </div>

                {/* Info card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle>{supplier.name}</CardTitle>
                                {supplier.nit && <CardDescription>NIT: {supplier.nit}</CardDescription>}
                            </div>
                            {supplier.status ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Activo</Badge>
                            ) : (
                                <Badge variant="secondary">Inactivo</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {supplier.contact_name && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Contacto</div>
                                    <div className="font-medium">{supplier.contact_name}</div>
                                </div>
                            )}
                            {supplier.phone && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Teléfono</div>
                                    <div className="font-medium">{supplier.phone}</div>
                                </div>
                            )}
                            {supplier.email && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Correo</div>
                                    <div className="font-medium">{supplier.email}</div>
                                </div>
                            )}
                            {supplier.address && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Dirección</div>
                                    <div className="font-medium">{supplier.address}</div>
                                </div>
                            )}
                            {supplier.branch && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Sucursal</div>
                                    <div className="font-medium">{supplier.branch.name}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-sm text-muted-foreground">Registrado</div>
                                <div className="font-medium">{formatDate(supplier.created_at)}</div>
                            </div>
                        </div>
                        {supplier.notes && (
                            <div className="mt-4">
                                <div className="text-sm text-muted-foreground">Notas</div>
                                <div className="mt-1 rounded-md bg-neutral-50 p-3 text-sm whitespace-pre-wrap dark:bg-neutral-800">
                                    {supplier.notes}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos vinculados</CardTitle>
                        <CardDescription>
                            {supplier.products?.length
                                ? `${supplier.products.length} producto(s) asociado(s) a este proveedor`
                                : 'Ningún producto asociado aún — vincúlalos desde Editar Producto'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {(supplier.products ?? []).length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                Sin productos. Asocia productos desde la página de edición de cada producto.
                            </p>
                        ) : (
                            <>
                                {/* Mobile: card list */}
                                <div className="divide-y md:hidden">
                                    {(supplier.products ?? []).map((p) => (
                                        <div key={p.id} className="flex items-start justify-between gap-2 px-4 py-3">
                                            <div className="min-w-0 flex-1">
                                                <Link href={route('products.show', p.id)} className="font-medium hover:underline">
                                                    {p.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">{p.code}</p>
                                                {p.pivot.purchase_price != null && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        Compra: ${Number(p.pivot.purchase_price).toLocaleString('es-CO')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                                <span className="text-xs font-medium">Stock: {p.stock}</span>
                                                {p.pivot.is_default ? (
                                                    <Badge className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">Predeterminado</Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop: full table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <Table
                                        columns={productColumns}
                                        data={(supplier.products ?? []).map((p) => ({ ...p, actions: null }))}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Movements with date filter */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>Historial de movimientos</CardTitle>
                                <CardDescription>
                                    Movimientos de stock vinculados a este proveedor
                                    {totalCost > 0 && (
                                        <span className="ml-2 font-medium text-foreground">
                                            — Total compras: $ {totalCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </span>
                                    )}
                                </CardDescription>
                            </div>
                            {/* Date filter */}
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Desde</Label>
                                    <Input type="date" className="h-8 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                                    <Input type="date" className="h-8 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                                <Button size="sm" className="h-8" onClick={applyDateFilter}>
                                    Filtrar
                                </Button>
                                {(filters.start_date || filters.end_date) && (
                                    <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={clearFilter}>
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {movements.data.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin movimientos registrados con este proveedor.</p>
                        ) : (
                            <>
                                {/* Mobile: card list */}
                                <div className="divide-y md:hidden">
                                    {movements.data.map((m) => (
                                        <div key={m.id} className="px-4 py-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">{formatDate(m.movement_date)}</span>
                                                <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-800'}`}>
                                                    {TYPE_LABELS[m.type] ?? m.type}
                                                </span>
                                            </div>
                                            <p className="mt-1 font-medium">
                                                {m.product ? (
                                                    <Link href={route('products.show', m.product_id)} className="hover:underline">
                                                        {m.product.name}
                                                    </Link>
                                                ) : `#${m.product_id}`}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Cant: {m.quantity}
                                                {m.unit_cost != null && <> · Costo: ${Number(m.unit_cost).toLocaleString('es-CO')}</>}
                                                {m.reference && <> · {m.reference}</>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop: full table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <Table
                                        columns={movementColumns}
                                        data={movements.data.map((m) => ({ ...m, actions: null }))}
                                    />
                                </div>
                            </>
                        )}
                        <PaginationFooter data={{ ...movements, resourceLabel: 'movimientos' }} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
