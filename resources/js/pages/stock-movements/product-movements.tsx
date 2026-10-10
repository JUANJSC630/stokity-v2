import PaginationFooter from '@/components/common/PaginationFooter';
import { MovementCards, MovementTable, type MovementRow } from '@/components/stock/movement-list';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRightLeft, Plus } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    code: string;
    stock: number;
    category: {
        id: number;
        name: string;
    } | null;
    branch: {
        id: number;
        name: string;
    };
}

interface Props {
    product: Product;
    movements: {
        data: MovementRow[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
}

export default function ProductMovements({ product, movements }: Props) {
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');

    // Validar que product existe
    if (!product) {
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title="Producto no encontrado" />
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <h1 className="mb-4 text-2xl font-semibold text-red-600">Producto no encontrado</h1>
                            <p className="mb-4 text-muted-foreground">El producto que buscas no existe o no tienes permisos para verlo.</p>
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
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Catálogo', href: '/products' },
        { title: product.name, href: `/products/${product.id}` },
        { title: 'Movimientos', href: `/products/${product.id}/movements` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Movimientos - ${product.name}`} />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={`/products/${product.id}`}
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Movimientos de Stock</p>
                        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{product.name}</h1>
                    </div>
                    <Link
                        href={`/stock-movements/create?product_id=${product.id}`}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Nuevo Movimiento</span>
                        <span className="sr-only sm:hidden">Nuevo Movimiento</span>
                    </Link>
                </div>

                <section
                    aria-label="Información del Producto"
                    className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 lg:grid-cols-4"
                >
                    <div>
                        <p className="text-xs text-muted-foreground">Stock Actual</p>
                        <p className="mt-0.5 text-3xl font-bold tabular-nums">{product.stock.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Código</p>
                        <p className="mt-1 font-mono text-sm font-semibold">{product.code}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Categoría</p>
                        <p className="mt-1 text-sm font-medium">{product.category?.name ?? 'Sin categoría'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Sucursal</p>
                        <p className="mt-1 text-sm font-medium">{product.branch.name}</p>
                    </div>
                </section>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <h2 className="px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Historial de Movimientos ({movements.total})
                    </h2>
                    {movements.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <ArrowRightLeft className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No se encontraron movimientos para este producto</p>
                        </div>
                    ) : isWide ? (
                        <MovementTable movements={movements.data} showProduct={false} caption="Movimientos de stock del producto" />
                    ) : (
                        <MovementCards movements={movements.data} showProduct={false} />
                    )}
                    <PaginationFooter data={{ ...movements, resourceLabel: 'movimientos' }} />
                </div>
            </div>
        </AppLayout>
    );
}
