import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Recycle, Search, Trash2 } from 'lucide-react';
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
    {
        title: 'Productos',
        href: '/products',
    },
    {
        title: 'Papelera',
        href: '/products/trashed',
    },
];

export default function TrashedProducts({
    products,
    categories = [],
    branches = [],
    filters = { search: '', category: 'all', branch: 'all' },
}: TrashedProductsPageProps) {
    // Add console log to debug the structure of products
    console.log('Trashed Products Props:', products);
    
    // Ensure products and their properties have valid values
    // Complete structure to avoid undefined errors
    const productData = {
        data: Array.isArray(products?.data) ? products.data : [],
        links: Array.isArray(products?.links) ? products.links : [],
        meta: products?.meta ? {
            current_page: typeof products.meta.current_page === 'number' ? products.meta.current_page : 1,
            last_page: typeof products.meta.last_page === 'number' ? products.meta.last_page : 1,
            per_page: typeof products.meta.per_page === 'number' ? products.meta.per_page : 10,
            total: typeof products.meta.total === 'number' ? products.meta.total : 0,
            from: typeof products.meta.from === 'number' ? products.meta.from : 0,
            to: typeof products.meta.to === 'number' ? products.meta.to : 0,
        } : {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0,
        }
    };
    
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters?.category || 'all');
    const [branchFilter, setBranchFilter] = useState(filters?.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const [productToForceDelete, setProductToForceDelete] = useState<Product | null>(null);
    const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);

    const isAdmin = auth.user.role === 'administrador';
    const isManager = auth.user.role === 'encargado';
    const canManageProducts = isAdmin || isManager;

    // Update search results when filters change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (
                searchQuery !== filters?.search ||
                categoryFilter !== filters?.category ||
                branchFilter !== filters?.branch
            ) {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos en Papelera" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header with title and back button */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Productos en Papelera</h1>
                    <div className="flex gap-2">
                        <Link href="/products">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <ArrowUpRight className="h-4 w-4" />
                                Volver a Productos
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="product-search" className="text-xs font-medium text-muted-foreground">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    id="product-search"
                                    type="search"
                                    placeholder="Buscar productos en papelera..."
                                    className="h-8 pl-8 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground">
                                Categoría
                            </label>
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
                                <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                    Sucursal
                                </label>
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
                <div className="relative overflow-hidden rounded-md bg-white shadow">
                    {isSearching && (
                        <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-medium">Producto</th>
                                    <th className="px-4 py-3 font-medium">Código</th>
                                    <th className="px-4 py-3 font-medium">Categoría</th>
                                    <th className="px-4 py-3 font-medium">Precio de venta</th>
                                    <th className="px-4 py-3 font-medium">Stock</th>
                                    {branches.length > 0 && (
                                        <th className="px-4 py-3 font-medium">Sucursal</th>
                                    )}
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {productData.data.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="h-10 w-10 rounded-md border object-cover"
                                                />
                                                <span>{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{product.code}</td>
                                        <td className="px-4 py-3">{product.category?.name}</td>
                                        <td className="px-4 py-3">
                                            $
                                            {Number(product.sale_price).toLocaleString('es-CO', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.stock <= product.min_stock ? (
                                                <span className="font-medium text-destructive">{product.stock}</span>
                                            ) : (
                                                <span>{product.stock}</span>
                                            )}
                                        </td>
                                        {branches.length > 0 && <td className="px-4 py-3">{product.branch?.name}</td>}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canManageProducts && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleRestore(product.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-1 h-8"
                                                        >
                                                            <Recycle className="h-4 w-4" />
                                                            <span>Restaurar</span>
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                setProductToForceDelete(product);
                                                                setForceDeleteModalOpen(true);
                                                            }}
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {productData.data.length === 0 && (
                                    <tr>
                                        <td colSpan={branches.length > 0 ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                                            No hay productos eliminados que mostrar
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {productData.meta && typeof productData.meta.last_page === 'number' && productData.meta.last_page > 1 && (
                        <div className="flex items-center justify-between border-t bg-white px-4 py-3">
                            <div className="text-sm text-gray-500">
                                Mostrando <span className="font-medium">{productData.meta?.from || 0}</span> a{' '}
                                <span className="font-medium">{productData.meta?.to || 0}</span> de{' '}
                                <span className="font-medium">{productData.meta?.total || 0}</span> resultados
                            </div>
                            <div className="flex gap-1">
                                {productData.links &&
                                    Array.isArray(productData.links) &&
                                    productData.links.map(
                                        (link, i) =>
                                            link && (
                                                <Button
                                                    key={i}
                                                    variant={link.active ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="text-xs"
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

                {/* Force Delete Confirmation Dialog */}
                <Dialog open={forceDeleteModalOpen} onOpenChange={setForceDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Eliminar permanentemente</DialogTitle>
                            <DialogDescription>
                                ¿Estás seguro de que deseas eliminar permanentemente este producto?
                                Esta acción no se puede deshacer y eliminará todos los datos asociados.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-3 rounded-md bg-red-50 p-3 text-red-800">
                            <Trash2 className="h-5 w-5" />
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
            </div>
        </AppLayout>
    );
}
