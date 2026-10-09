import { SearchField } from '@/components/common/search-field';
import { ProductThumb, StockFigure } from '@/components/products/product-meta';
import { SELECT_TRIGGER } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Recycle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrashedProductsPageProps {
    products?: {
        data: Product[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number;
            to: number;
        };
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    categories: Category[];
    branches: Branch[];
    filters?: {
        search?: string;
        category?: string;
        branch?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Catálogo', href: '/products' },
    { title: 'Papelera', href: '/products/trashed' },
];

export default function TrashedProducts({
    products,
    categories = [],
    branches = [],
    filters = { search: '', category: 'all', branch: 'all' },
}: TrashedProductsPageProps) {
    const productData = {
        data: Array.isArray(products?.data) ? products.data : [],
        links: Array.isArray(products?.links) ? products.links : [],
        meta: products?.meta
            ? {
                  current_page: typeof products.meta.current_page === 'number' ? products.meta.current_page : 1,
                  last_page: typeof products.meta.last_page === 'number' ? products.meta.last_page : 1,
                  per_page: typeof products.meta.per_page === 'number' ? products.meta.per_page : 10,
                  total: typeof products.meta.total === 'number' ? products.meta.total : 0,
                  from: typeof products.meta.from === 'number' ? products.meta.from : 0,
                  to: typeof products.meta.to === 'number' ? products.meta.to : 0,
              }
            : {
                  current_page: 1,
                  last_page: 1,
                  per_page: 10,
                  total: 0,
                  from: 0,
                  to: 0,
              },
    };

    const isWide = useMediaQuery('(min-width: 768px)');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters?.category || 'all');
    const [branchFilter, setBranchFilter] = useState(filters?.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const [productToForceDelete, setProductToForceDelete] = useState<Product | null>(null);
    const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);

    const { can } = usePermissions();
    const isAdmin = can('branches.view');
    const canRestore = can('products.restore');
    const canForceDelete = can('products.force_delete');

    // Update search results when filters change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search || categoryFilter !== filters?.category || branchFilter !== filters?.branch) {
                setIsSearching(true);

                // Build query string
                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
                if (branchFilter && branchFilter !== 'all') params.append('branch', branchFilter);
                params.append('page', '1'); // Reset to page 1 when filters change

                router.visit(`/products/trashed?${params.toString()}`, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['products'],
                    onFinish: () => {
                        setIsSearching(false);
                    },
                });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, categoryFilter, branchFilter, filters]);

    // Handle pagination
    const handlePaginationClick = (url: string | null) => {
        if (url) {
            setIsSearching(true);
            router.visit(url, {
                preserveState: true,
                preserveScroll: true,
                only: ['products'],
                onFinish: () => {
                    setIsSearching(false);
                },
            });
        }
    };

    // Handle restore
    const handleRestore = (productId: number) => {
        router.put(`/products/${productId}/restore`);
    };

    // Handle force delete confirmation
    const handleForceDelete = () => {
        if (productToForceDelete) {
            router.delete(`/products/${productToForceDelete.id}/force-delete`, {
                onSuccess: () => {
                    setForceDeleteModalOpen(false);
                    setProductToForceDelete(null);
                },
            });
        }
    };

    const askForceDelete = (product: Product) => {
        setProductToForceDelete(product);
        setForceDeleteModalOpen(true);
    };

    const showBranch = branches.length > 0;

    const rowActions = (product: Product) => (
        <>
            {canRestore && (
                <Button onClick={() => handleRestore(product.id)} variant="outline" className="h-11 gap-1.5 sm:h-9">
                    <Recycle className="size-4" aria-hidden="true" />
                    Restaurar
                </Button>
            )}
            {canForceDelete && (
                <Button
                    aria-label="Eliminar permanentemente"
                    title="Eliminar permanentemente"
                    onClick={() => askForceDelete(product)}
                    variant="outline"
                    className="size-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:size-9 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                </Button>
            )}
        </>
    );

    const { meta, links } = productData;
    const allLinks = links as { url: string | null; label: string; active: boolean }[];
    const pageLinks = allLinks.filter((l) => !isNaN(Number(l.label)));
    const prevUrl = allLinks[0]?.url ?? null;
    const nextUrl = allLinks[allLinks.length - 1]?.url ?? null;
    const start = Math.max(0, Math.min(meta.current_page - 3, pageLinks.length - 5));
    const window5 = pageLinks.slice(start, start + 5);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos en Papelera" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/products"
                        aria-label="Volver a Productos"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Productos en Papelera</h1>
                        <p className="text-sm text-muted-foreground">Restaura un artículo o elimínalo para siempre.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <SearchField
                        id="product-search"
                        label="Buscar productos en papelera"
                        placeholder="Buscar productos en papelera..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSubmit={() => undefined}
                    />
                    <div className={cn('grid grid-cols-2 gap-3', 'lg:max-w-xl')}>
                        <div className="space-y-1.5">
                            <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground">
                                Categoría
                            </label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger id="category-filter" className={SELECT_TRIGGER}>
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isAdmin && branches.length > 0 && (
                            <div className="space-y-1.5">
                                <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                    Sucursal
                                </label>
                                <Select value={branchFilter} onValueChange={setBranchFilter}>
                                    <SelectTrigger id="branch-filter" className={SELECT_TRIGGER}>
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    aria-busy={isSearching}
                    className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card transition-opacity',
                        isSearching && 'pointer-events-none opacity-60',
                    )}
                >
                    {productData.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Trash2 className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay productos eliminados que mostrar</p>
                            <p className="text-sm text-muted-foreground">Lo que elimines del catálogo aparecerá aquí.</p>
                        </div>
                    ) : isWide ? (
                        <table aria-label="Productos eliminados" className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Nombre
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Categoría
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-medium">
                                        Precio de venta
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-center font-medium">
                                        Stock
                                    </th>
                                    {showBranch && (
                                        <th scope="col" className="px-3 py-3 font-medium">
                                            Sucursal
                                        </th>
                                    )}
                                    <th scope="col" className="px-6 py-3">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {productData.data.map((product) => (
                                    <tr key={product.id} className="hover:bg-muted/40">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <ProductThumb src={product.image_url} name={product.name} />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{product.name}</p>
                                                    <p className="font-mono text-xs text-muted-foreground">{product.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">{product.category?.name || 'N/A'}</td>
                                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                                            {formatCurrency(Number(product.sale_price))}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <StockFigure product={product} />
                                        </td>
                                        {showBranch && <td className="px-3 py-3 text-muted-foreground">{product.branch?.name || 'N/A'}</td>}
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end gap-2">{rowActions(product)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <ul className="divide-y divide-border/40">
                            {productData.data.map((product) => (
                                <li key={product.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex items-center gap-3">
                                        <ProductThumb src={product.image_url} name={product.name} size="lg" />
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="line-clamp-2 min-w-0 text-[15px] leading-tight font-semibold">{product.name}</span>
                                                <span className="shrink-0 text-[15px] font-bold tabular-nums">
                                                    {formatCurrency(Number(product.sale_price))}
                                                </span>
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                <span className="font-mono">{product.code}</span>
                                                {product.category?.name ? ` · ${product.category.name}` : ''}
                                                {showBranch && product.branch?.name ? ` · ${product.branch.name}` : ''}
                                            </p>
                                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                Stock <StockFigure product={product} className="text-foreground" />
                                            </p>
                                        </div>
                                    </div>
                                    {(canRestore || canForceDelete) && <div className="flex justify-end gap-2">{rowActions(product)}</div>}
                                </li>
                            ))}
                        </ul>
                    )}

                    {meta.last_page > 1 && (
                        <div className="flex flex-col items-center gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Mostrando <span className="font-medium text-foreground">{meta.from || 0}</span> a{' '}
                                <span className="font-medium text-foreground">{meta.to || 0}</span> de{' '}
                                <span className="font-medium text-foreground">{meta.total || 0}</span> resultados
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    aria-label="Anterior"
                                    className="size-11 sm:size-9"
                                    disabled={!prevUrl}
                                    onClick={() => prevUrl && handlePaginationClick(prevUrl)}
                                >
                                    <ChevronLeft className="size-4" aria-hidden="true" />
                                </Button>
                                {start > 0 && (
                                    <>
                                        <Button
                                            variant={meta.current_page === 1 ? 'default' : 'outline'}
                                            className="size-11 sm:size-9"
                                            onClick={() => handlePaginationClick(pageLinks[0].url!)}
                                        >
                                            1
                                        </Button>
                                        {start > 1 && <span className="px-0.5 text-xs text-muted-foreground">…</span>}
                                    </>
                                )}
                                {window5.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        className="size-11 sm:size-9"
                                        disabled={!link.url}
                                        onClick={() => link.url && handlePaginationClick(link.url)}
                                    >
                                        {link.label}
                                    </Button>
                                ))}
                                {start + 5 < pageLinks.length && (
                                    <>
                                        {start + 5 < pageLinks.length - 1 && <span className="px-0.5 text-xs text-muted-foreground">…</span>}
                                        <Button
                                            variant={meta.current_page === meta.last_page ? 'default' : 'outline'}
                                            className="size-11 sm:size-9"
                                            onClick={() => handlePaginationClick(pageLinks[pageLinks.length - 1].url!)}
                                        >
                                            {meta.last_page}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    aria-label="Siguiente"
                                    className="size-11 sm:size-9"
                                    disabled={!nextUrl}
                                    onClick={() => nextUrl && handlePaginationClick(nextUrl)}
                                >
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Force Delete Confirmation Dialog */}
            <Dialog open={forceDeleteModalOpen} onOpenChange={setForceDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar permanentemente</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar permanentemente este producto? Esta acción no se puede deshacer y eliminará todos los
                            datos asociados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-3 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                        <Trash2 className="h-5 w-5 shrink-0" />
                        <div className="text-sm">
                            <strong>¡Atención!</strong> El producto <strong>{productToForceDelete?.name}</strong> será eliminado permanentemente.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setForceDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleForceDelete}>
                            Eliminar permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
