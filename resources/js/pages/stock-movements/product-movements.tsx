import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Eye, Plus } from 'lucide-react';

interface StockMovement {
    id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_cost: number | null;
    reference: string | null;
    notes: string | null;
    movement_date: string;
    created_at: string;
    user: {
        id: number;
        name: string;
    };
    branch: {
        id: number;
        name: string;
    };
}

interface Product {
    id: number;
    name: string;
    code: string;
    stock: number;
    category: {
        id: number;
        name: string;
    };
    branch: {
        id: number;
        name: string;
    };
}

interface Props {
    product: Product;
    movements: {
        data: StockMovement[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
}

export default function ProductMovements({ product, movements }: Props) {
    // Validar que product existe
    if (!product) {
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title="Producto no encontrado" />
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <h1 className="mb-4 text-2xl font-semibold text-red-600">Producto no encontrado</h1>
                            <p className="mb-4 text-gray-600">El producto que buscas no existe o no tienes permisos para verlo.</p>
                            {/* Debug information removed for security. */}
                            <Link href="/products">
                                <Button className="mt-4">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver a Productos
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Validar que product tiene las propiedades necesarias
    if (!product.category || !product.branch) {
        console.error('Product missing required properties:', product);
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title="Error en datos del producto" />
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <h1 className="mb-4 text-2xl font-semibold text-red-600">Error en datos del producto</h1>
                            <p className="mb-4 text-gray-600">Los datos del producto están incompletos.</p>
                            <pre className="mt-2 rounded bg-gray-100 p-2 text-xs">{JSON.stringify({ product, movements }, null, 2)}</pre>
                            <Link href="/products">
                                <Button className="mt-4">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver a Productos
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Productos',
            href: '/products',
        },
        {
            title: product.name,
            href: `/products/${product.id}`,
        },
        {
            title: 'Movimientos',
            href: `/products/${product.id}/movements`,
        },
    ];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'in':
                return 'bg-green-100 text-green-800';
            case 'out':
                return 'bg-red-100 text-red-800';
            case 'adjustment':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'in':
                return 'Entrada';
            case 'out':
                return 'Salida';
            case 'adjustment':
                return 'Ajuste';
            default:
                return 'Desconocido';
        }
    };

    const columns: Column<StockMovement>[] = [
        {
            key: 'movement_date',
            title: 'Fecha',
            render: (value) => format(new Date(value as string), 'dd/MM/yyyy HH:mm', { locale: es }),
        },
        {
            key: 'type',
            title: 'Tipo',
            render: (value) => <Badge className={getTypeColor(value as string)}>{getTypeLabel(value as string)}</Badge>,
        },
        {
            key: 'quantity',
            title: 'Cantidad',
            render: (value) => <span className="font-medium">{(value as number).toLocaleString()}</span>,
        },
        {
            key: 'previous_stock',
            title: 'Stock Anterior',
            render: (value) => (value as number).toLocaleString(),
        },
        {
            key: 'new_stock',
            title: 'Stock Nuevo',
            render: (value) => <span className="font-medium">{(value as number).toLocaleString()}</span>,
        },
        {
            key: 'unit_cost',
            title: 'Costo Unit.',
            render: (value) => (value ? `$${(value as number).toLocaleString()}` : '-') as React.ReactNode,
        },
        {
            key: 'reference',
            title: 'Referencia',
            render: (value) => (value || '-') as React.ReactNode,
        },
        {
            key: 'user',
            title: 'Usuario',
            render: (value, row) => row.user.name,
        },
        {
            key: 'notes',
            title: 'Notas',
            render: (value) =>
                (value ? (
                    <div className="max-w-xs truncate" title={value as string}>
                        {value as string}
                    </div>
                ) : (
                    '-'
                )) as React.ReactNode,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Movimientos - ${product.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-2xl font-semibold">Movimientos de Stock</h1>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/products/${product.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Volver</span>
                            </Button>
                        </Link>
                        <Link href={`/stock-movements/create?product_id=${product.id}`}>
                            <Button size="sm" className="flex items-center gap-1">
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Nuevo Movimiento</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Información del producto */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Producto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Código</label>
                                <p className="text-base font-medium sm:text-lg">{product.code}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Nombre</label>
                                <p className="text-base font-medium sm:text-lg">{product.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Categoría</label>
                                <p className="text-base sm:text-lg">{product.category.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Stock Actual</label>
                                <p className="text-base font-bold text-blue-600 sm:text-lg">{product.stock.toLocaleString()}</p>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-sm font-medium text-gray-600">Sucursal</label>
                                <p className="text-base sm:text-lg">{product.branch.name}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de movimientos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Movimientos ({movements.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Vista tabla en md+ */}
                        <div className="hidden md:block">
                            <Table columns={columns} data={movements.data} emptyMessage="No se encontraron movimientos para este producto" />
                        </div>

                        {/* Vista tarjetas en móvil */}
                        <div className="block md:hidden">
                            {movements.data.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground">No se encontraron movimientos para este producto</div>
                            ) : (
                                movements.data.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${getTypeColor(movement.type)}`}
                                                >
                                                    <span className="text-xs font-medium">
                                                        {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '='}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                        {format(new Date(movement.movement_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={getTypeColor(movement.type)}>{getTypeLabel(movement.type)}</Badge>
                                        </div>

                                        <div className="mb-2 space-y-1">
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Cantidad:{' '}
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                                                    {movement.quantity.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Stock anterior:{' '}
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                                                    {movement.previous_stock.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Stock nuevo:{' '}
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                                                    {movement.new_stock.toLocaleString()}
                                                </span>
                                            </div>
                                            {movement.unit_cost && (
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    Costo unitario:{' '}
                                                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                                                        ${movement.unit_cost.toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            {movement.reference && (
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    Referencia:{' '}
                                                    <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.reference}</span>
                                                </div>
                                            )}
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Usuario:{' '}
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.user.name}</span>
                                            </div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Sucursal:{' '}
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{movement.branch.name}</span>
                                            </div>
                                        </div>

                                        {movement.notes && (
                                            <div className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                <div className="mb-1 font-medium">Notas:</div>
                                                <div className="rounded bg-neutral-50 p-2 dark:bg-neutral-800">{movement.notes}</div>
                                            </div>
                                        )}

                                        <div className="mt-2 flex justify-end gap-2">
                                            <Link href={`/products/${product.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver producto">
                                                    <Eye className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <PaginationFooter
                            data={{
                                ...movements,
                                data: movements.data,
                                links: movements.links,
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
