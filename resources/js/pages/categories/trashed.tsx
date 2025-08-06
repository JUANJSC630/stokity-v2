import PaginationFooter from '@/components/common/PaginationFooter';
import { Column, Table } from '@/components/common/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { AlertTriangle, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TrashedCategoriesPageProps {
    categories: {
        data: Category[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters?: {
        search?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categorías',
        href: '/categories',
    },
    {
        title: 'Eliminadas',
        href: '/categories/trashed',
    },
];

export default function TrashedCategories({ categories, filters = { search: '' } }: TrashedCategoriesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [categoryToForceDelete, setCategoryToForceDelete] = useState<Category | null>(null);
    const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [categoryToRestore, setCategoryToRestore] = useState<Category | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters = url.searchParams.get('search');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setSearch('');
                applyFilters('');
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const applyFilters = (searchParam = search) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) {
            params.append('search', searchParam);
        }

        router.visit(`/categories/trashed?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['categories'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    // Handle force delete confirmation
    const handleForceDelete = () => {
        if (categoryToForceDelete) {
            router.delete(`/categories/${categoryToForceDelete.id}/force-delete`, {
                onSuccess: () => {
                    setForceDeleteModalOpen(false);
                    setCategoryToForceDelete(null);
                },
            });
        }
    };

    // Handle restore confirmation
    const handleRestore = () => {
        if (categoryToRestore) {
            router.put(
                `/categories/${categoryToRestore.id}/restore`,
                {},
                {
                    onSuccess: () => {
                        setRestoreModalOpen(false);
                        setCategoryToRestore(null);
                    },
                },
            );
        }
    };

    // Table columns for desktop
    const columns: Column<Category & { actions: null }>[] = [
        { key: 'name', title: 'Nombre', render: (_: unknown, row: Category) => <span className="font-medium">{row.name}</span> },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, category: Category) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                            setCategoryToRestore(category);
                            setRestoreModalOpen(true);
                        }}
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    {auth.user.role === 'administrador' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => {
                                setCategoryToForceDelete(category);
                                setForceDeleteModalOpen(true);
                            }}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías Eliminadas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Título y botón volver alineados a la derecha */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-3xl font-bold">Categorías Eliminadas</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex gap-2" asChild>
                            <Link href="/categories">
                                <ArrowLeft className="size-4" />
                                <span>Volver a Categorías</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filtro en Card */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Categorías</CardTitle>
                            <CardDescription>Busca categorías por nombre</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="category-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    ref={searchRef}
                                                    type="search"
                                                    placeholder="Buscar por nombre de categoría"
                                                    className="h-8 pl-8 text-sm"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla y Cards */}
                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    {isSearching && (
                        <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-neutral-900">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900 dark:border-neutral-100"></div>
                        </div>
                    )}

                    {/* Tabla reutilizable en desktop y mobile */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={categories.data.map((category) => ({ ...category, actions: null }))} />
                    </div>
                    <div className="block md:hidden">
                        <Table columns={columns} data={categories.data.map((category) => ({ ...category, actions: null }))} />
                    </div>

                    {/* Pagination */}
                    <div>
                        <PaginationFooter
                            data={{
                                ...categories,
                                resourceLabel: 'categorías',
                            }}
                        />
                    </div>
                </div>

                {/* Force Delete Confirmation Dialog */}
                <Dialog open={forceDeleteModalOpen} onOpenChange={setForceDeleteModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:border-neutral-700 dark:bg-neutral-900">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="flex items-center gap-2 text-lg font-semibold dark:text-neutral-100">
                                <AlertTriangle className="size-5 text-red-500" />
                                Confirmar eliminación permanente
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-neutral-600 dark:text-neutral-300">
                            {categoryToForceDelete && (
                                <p>
                                    ¿Está seguro de eliminar permanentemente la categoría{' '}
                                    <strong className="text-neutral-900 dark:text-neutral-100">{categoryToForceDelete.name}</strong>? Esta acción no
                                    se puede deshacer.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="rounded-lg border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                onClick={() => setForceDeleteModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                                onClick={handleForceDelete}
                            >
                                Eliminar Permanentemente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Restore Confirmation Dialog */}
                <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:border-neutral-700 dark:bg-neutral-900">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Restaurar Categoría</DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-neutral-600 dark:text-neutral-300">
                            {categoryToRestore && (
                                <p>
                                    ¿Desea restaurar la categoría{' '}
                                    <strong className="text-neutral-900 dark:text-neutral-100">{categoryToRestore.name}</strong>?
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                onClick={() => setRestoreModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="rounded-lg bg-black font-medium hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                                onClick={handleRestore}
                            >
                                Restaurar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
