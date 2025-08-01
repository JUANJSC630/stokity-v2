import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProductsPageProps {
    products: {
        data: Product[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
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
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [category, setCategory] = useState(filters?.category || 'all');
    const [branch, setBranch] = useState(filters?.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const isAdmin = auth.user.role === 'administrador';
    const isManager = auth.user.role === 'encargado';
    const canManageProducts = isAdmin || isManager;

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters =
                url.searchParams.get('search') ||
                url.searchParams.get('status') ||
                url.searchParams.get('category') ||
                url.searchParams.get('branch');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setSearch('');
                setStatus('all');
                setCategory('all');
                setBranch('all');
                applyFilters('', 'all', 'all', 'all');
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (newStatus && newStatus !== 'all') params.append('status', newStatus);
        if (category && category !== 'all') params.append('category', category);
        if (branch && branch !== 'all') params.append('branch', branch);
        router.visit(`/products?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['products'],
        });
    };

    const applyFilters = (searchParam = search, statusParam = status, categoryParam = category, branchParam = branch) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) {
            params.append('search', searchParam);
        }

        if (statusParam && statusParam !== 'all') {
            params.append('status', statusParam);
        }

        if (categoryParam && categoryParam !== 'all') {
            params.append('category', categoryParam);
        }

        if (branchParam && branchParam !== 'all') {
            params.append('branch', branchParam);
        }

        router.visit(`/products?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['products'],
            onFinish: () => setIsSearching(false),
        });
    };

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

    const columns: Column<Product & { actions: null }>[] = [
        {
            key: 'name',
            title: 'Producto',
            render: (_: unknown, row: Product) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image_url}
                        alt={row.name}
                        className="h-10 w-10 rounded-md border border-neutral-200 bg-muted object-cover dark:border-neutral-700"
                    />
                    <span className="text-neutral-900 dark:text-neutral-100">{row.name}</span>
                </div>
            ),
        },
        { key: 'code', title: 'Código' },
        { key: 'category', title: 'Categoría', render: (_: unknown, row: Product) => row.category?.name },
        {
            key: 'sale_price',
            title: 'Precio de venta',
            render: (_: unknown, row: Product) => (
                <span className="text-neutral-700 dark:text-neutral-200">
                    ${Number(row.sale_price).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            ),
        },
        {
            key: 'tax',
            title: 'Impuesto',
            render: (_: unknown, row: Product) => <span className="text-neutral-700 dark:text-neutral-200">{row.tax || 0}%</span>,
        },
        {
            key: 'stock',
            title: 'Stock',
            render: (_: unknown, row: Product) =>
                row.stock <= row.min_stock ? (
                    <span className="inline-flex items-center justify-center rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                        {row.stock}
                    </span>
                ) : (
                    <span className="text-neutral-700 dark:text-neutral-200">{row.stock}</span>
                ),
        },
        {
            key: 'status',
            title: 'Estado',
            render: (_: unknown, row: Product) =>
                row.status ? (
                    <Badge variant="default" className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                        Activo
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        Inactivo
                    </Badge>
                ),
        },
        ...(isAdmin
            ? [
                  {
                      key: 'branch' as keyof (Product & { actions: null }),
                      title: 'Sucursal',
                      render: (_: unknown, row: Product) => row.branch?.name,
                  },
              ]
            : []),
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Product) => (
                <div className="flex gap-1">
                    <Link href={`/products/${row.id}`}>
                        <EyeButton text="Ver Producto" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Productos</h1>
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

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Productos</CardTitle>
                            <CardDescription>Busca productos por código, nombre, estado, categoría o sucursal</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="product-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    ref={searchRef}
                                                    type="search"
                                                    placeholder="Buscar por código, cliente o vendedor"
                                                    className="h-8 pl-8 text-sm"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="status-filter" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Estado
                                    </Label>
                                    <Select value={status} onValueChange={handleStatusChange}>
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
                                    <Select
                                        value={category}
                                        onValueChange={(value) => {
                                            setCategory(value);
                                            applyFilters(search, status, value, branch);
                                        }}
                                    >
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
                                        <Select
                                            value={branch}
                                            onValueChange={(value) => {
                                                setBranch(value);
                                                applyFilters(search, status, category, value);
                                            }}
                                        >
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
                        </CardContent>
                    </Card>
                </div>

                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    {isSearching && (
                        <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-neutral-900">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900 dark:border-neutral-100"></div>
                        </div>
                    )}

                    {/* Vista tabla en md+ */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={products.data.map((product) => ({ ...product, actions: null }))} />
                    </div>

                    {/* Vista tarjetas en móvil */}
                    <div className="block md:hidden">
                        {products.data.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">No hay productos que mostrar</div>
                        ) : (
                            products.data.map((product) => (
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
                    <div>
                        <PaginationFooter
                            data={{
                                ...products,
                                resourceLabel: 'productos',
                            }}
                        />
                    </div>
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
