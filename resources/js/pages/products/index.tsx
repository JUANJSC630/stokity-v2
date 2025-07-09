import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductsPageProps {
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
        status?: string;
        category?: string;
        branch?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/products',
    },
];

export default function Products({
    products,
    categories = [],
    branches = [],
    filters = { search: '', status: 'all', category: 'all', branch: 'all' },
}: ProductsPageProps) {
    // Asegurar que products y sus propiedades tengan valores válidos
    // Estructura completa para evitar errores de undefined
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
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [categoryFilter, setCategoryFilter] = useState(filters?.category || 'all');
    const [branchFilter, setBranchFilter] = useState(filters?.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const isAdmin = auth.user.role === 'administrador';
    const isManager = auth.user.role === 'encargado';
    const canManageProducts = isAdmin || isManager;

    // Update search results when filters change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (
                searchQuery !== filters?.search ||
                statusFilter !== filters?.status ||
                categoryFilter !== filters?.category ||
                branchFilter !== filters?.branch
            ) {
                setIsSearching(true);

                // Build query string
                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
                if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
                if (branchFilter && branchFilter !== 'all') params.append('branch', branchFilter);
                params.append('page', '1'); // Reset to page 1 when filters change

                router.visit(`/products?${params.toString()}`, {
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
    }, [searchQuery, statusFilter, categoryFilter, branchFilter, filters]);

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

    // Handle delete confirmation
    const handleDelete = () => {
        if (productToDelete) {
            router.delete(`/products/${productToDelete.id}`, {
                onSuccess: () => {
                    setDeleteModalOpen(false);
                    setProductToDelete(null);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header with title and add button */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Productos</h1>
                    <div className="flex gap-2">
                        {canManageProducts && (
                            <>
                                <Link href="/products/create">
                                    <Button size="sm" className="flex items-center gap-1">
                                        <Plus className="h-4 w-4" />
                                        Nuevo Producto
                                    </Button>
                                </Link>
                                <Link href="/products/trashed">
                                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="product-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Buscar
                            </Label>
                            <div className="relative">
                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                <Input
                                    id="product-search"
                                    type="search"
                                    placeholder="Buscar productos..."
                                    className="h-8 pl-8 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="status-filter" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Estado
                            </Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="status-filter" className="h-8 text-sm">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="1">Activos</SelectItem>
                                    <SelectItem value="0">Inactivos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="category-filter" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Categoría
                            </Label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger id="category-filter" className="h-8 text-sm">
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
                                <Label htmlFor="branch-filter" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                    Sucursal
                                </Label>
                                <Select value={branchFilter} onValueChange={setBranchFilter}>
                                    <SelectTrigger id="branch-filter" className="h-8 text-sm">
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

                {/* Products table */}
                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    {isSearching && (
                        <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-neutral-900">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900 dark:border-neutral-100"></div>
                        </div>
                    )}
                    {/* Vista tabla en md+ */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-800">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-medium">Producto</th>
                                    <th className="px-4 py-3 font-medium">Código</th>
                                    <th className="px-4 py-3 font-medium">Categoría</th>
                                    <th className="px-4 py-3 font-medium">Precio de venta</th>
                                    <th className="px-4 py-3 font-medium">Stock</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                    {isAdmin && <th className="px-4 py-3 font-medium">Sucursal</th>}
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {productData.data.map((product) => (
                                    <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="h-10 w-10 rounded-md border border-neutral-200 bg-muted object-cover dark:border-neutral-700"
                                                />
                                                <span className="text-neutral-900 dark:text-neutral-100">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{product.code}</td>
                                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{product.category?.name}</td>
                                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                                            $
                                            {Number(product.sale_price).toLocaleString('es-CO', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {product.stock <= product.min_stock ? (
                                                <span className="inline-flex items-center justify-center rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    {product.stock}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-700 dark:text-neutral-200">{product.stock}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.status ? (
                                                <Badge
                                                    variant="default"
                                                    className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                                                >
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                                                >
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </td>
                                        {isAdmin && <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{product.branch?.name}</td>}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex gap-2">
                                                <Link href={`/products/${product.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalles">
                                                        <Eye className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {productData.data.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                                            No hay productos que mostrar
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Vista tarjetas en móvil */}
                    <div className="block md:hidden">
                        {productData.data.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">No hay productos que mostrar</div>
                        ) : (
                            productData.data.map((product) => (
                                <div
                                    key={product.id}
                                    className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                >
                                    <div className="mb-2 flex items-center gap-3">
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="h-12 w-12 rounded-md border border-neutral-200 bg-muted object-cover dark:border-neutral-700"
                                        />
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{product.name}</div>
                                    </div>
                                    <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Código: {product.code}</div>
                                    <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Categoría: {product.category?.name}</div>
                                    <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        Precio: $
                                        {Number(product.sale_price).toLocaleString('es-CO', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </div>
                                    <div className="mb-1 text-xs">
                                        Stock:{' '}
                                        {product.stock <= product.min_stock ? (
                                            <span className="font-medium text-red-700 dark:text-red-200">{product.stock}</span>
                                        ) : (
                                            <span className="text-neutral-700 dark:text-neutral-200">{product.stock}</span>
                                        )}
                                    </div>
                                    <div className="mb-1 text-xs">
                                        Estado:{' '}
                                        {product.status ? (
                                            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Sucursal: {product.branch?.name}</div>
                                    )}
                                    <div className="mt-2 flex justify-end gap-2">
                                        <Link href={`/products/${product.id}`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalles">
                                                <Eye className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {productData.meta && typeof productData.meta.last_page === 'number' && productData.meta.last_page > 1 && (
                        <div className="flex flex-col items-start gap-2 border-t bg-white px-2 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="w-full text-left text-sm text-neutral-500 sm:w-auto dark:text-neutral-400">
                                Mostrando <span className="font-medium text-neutral-700 dark:text-neutral-200">{productData.meta?.from || 0}</span> a{' '}
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{productData.meta?.to || 0}</span> de{' '}
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{productData.meta?.total || 0}</span> resultados
                            </div>
                            <div className="flex w-full flex-wrap justify-center gap-1 sm:w-auto sm:justify-end">
                                {productData.links &&
                                    Array.isArray(productData.links) &&
                                    productData.links.map(
                                        (link, i) =>
                                            link && (
                                                <Button
                                                    key={i}
                                                    variant={link.active ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`text-xs ${link.active ? 'bg-black text-white dark:bg-neutral-100 dark:text-neutral-900' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'}`}
                                                    disabled={!link.url}
                                                    onClick={() => link.url && handlePaginationClick(link.url)}
                                                >
                                                    <span dangerouslySetInnerHTML={{ __html: link.label || '' }} />
                                                </Button>
                                            ),
                                    )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete confirmation modal */}
                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar producto?</DialogTitle>
                            <DialogDescription>
                                El producto será enviado a la papelera. Puedes restaurarlo más tarde si lo necesitas.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-3 rounded-md bg-amber-50 p-3 text-amber-800">
                            <AlertTriangle className="h-5 w-5" />
                            <div className="text-sm">
                                <strong>¿Estás seguro?</strong> Esta acción no se puede deshacer inmediatamente.
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
