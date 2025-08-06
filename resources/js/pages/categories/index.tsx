import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { AlertTriangle, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CategoriesPageProps {
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
];

export default function Categories({ categories, filters = { search: '' } }: CategoriesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    // Inertia form for editing and creating
    const form = useForm({
        name: '',
    });

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

        router.visit(`/categories?${params.toString()}`, {
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

    // Handle delete confirmation
    const handleDelete = () => {
        if (categoryToDelete) {
            router.delete(`/categories/${categoryToDelete.id}`, {
                onSuccess: () => {
                    setDeleteModalOpen(false);
                    setCategoryToDelete(null);
                },
            });
        }
    };

    // Open edit modal and populate form
    const openEditModal = (category: Category) => {
        setCategoryToEdit(category);
        form.setData('name', category.name);
        setEditModalOpen(true);
    };

    // Handle form submission for editing
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (categoryToEdit) {
            form.put(`/categories/${categoryToEdit.id}`, {
                onSuccess: () => {
                    setEditModalOpen(false);
                    setCategoryToEdit(null);
                    form.reset();
                },
            });
        }
    };

    // Handle form submission for creating
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/categories', {
            onSuccess: () => {
                setCreateModalOpen(false);
                form.reset();
            },
        });
    };

    // Open create modal and reset form
    const openCreateModal = () => {
        form.reset();
        setCreateModalOpen(true);
    };

    // Table columns for desktop
    const columns: Column<Category & { actions: null }>[] = [
        { key: 'name', title: 'Nombre', render: (_: unknown, row: Category) => <span className="font-medium">{row.name}</span> },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Category) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(row)}>
                        <Edit2 className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                            setCategoryToDelete(row);
                            setDeleteModalOpen(true);
                        }}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Título y botones juntos alineados a la derecha */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-3xl font-bold">Gestión de Categorías</h1>
                    <div className="flex gap-2">
                        {(auth.user.role === 'administrador' || auth.user.role === 'encargado') && (
                            <Button className="flex gap-1" onClick={openCreateModal}>
                                <Plus className="mr-1 size-4" />
                                Nueva Categoría
                            </Button>
                        )}
                        {auth.user.role === 'administrador' && (
                            <Link href="/categories/trashed">
                                <Button variant="outline" className="flex gap-2">
                                    <Trash2 className="size-4" />
                                    Categorías Eliminadas
                                </Button>
                            </Link>
                        )}
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

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={categories.data.map((category) => ({ ...category, actions: null }))} />
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden">
                        {categories.data.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron categorías</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {categories.data.map((category) => (
                                    <div key={category.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{category.name}</div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={() => openEditModal(category)}>
                                                    <Edit2 className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 p-0 text-red-500"
                                                    onClick={() => {
                                                        setCategoryToDelete(category);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:border-gray-700 dark:bg-neutral-900/50">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="flex items-center gap-2 text-lg font-semibold dark:text-gray-100">
                                <AlertTriangle className="size-5 text-red-500" />
                                Confirmar eliminación
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-gray-600 dark:text-gray-300">
                            {categoryToDelete && (
                                <p>
                                    ¿Está seguro de eliminar la categoría{' '}
                                    <strong className="text-gray-900 dark:text-gray-100">{categoryToDelete.name}</strong>? Esta acción puede ser
                                    revertida posteriormente.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                onClick={() => setDeleteModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                                onClick={handleDelete}
                            >
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Category Dialog */}
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:border-gray-700 dark:bg-neutral-900">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar Categoría</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500 dark:text-gray-300">
                                Actualiza el nombre de la categoría y haz clic en guardar cuando termines.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                            <div className="space-y-4">
                                <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Nombre
                                </label>
                                <Input
                                    id="name"
                                    placeholder="Nombre de la categoría"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="rounded-md border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-gray-500 dark:focus:ring-gray-600"
                                />
                                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                            </div>
                            <DialogFooter className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                    onClick={() => setEditModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-black font-medium hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                                >
                                    Guardar cambios
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Create Category Dialog */}
                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:border-gray-700 dark:bg-neutral-900">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Crear Nueva Categoría</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500 dark:text-gray-300">
                                Ingresa el nombre de la nueva categoría y haz clic en guardar.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                            <div className="space-y-4">
                                <label htmlFor="create-name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Nombre
                                </label>
                                <Input
                                    id="create-name"
                                    placeholder="Nombre de la categoría"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="rounded-md border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-gray-500 dark:focus:ring-gray-600"
                                    autoFocus
                                />
                                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                            </div>
                            <DialogFooter className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                    onClick={() => setCreateModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-black font-medium hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                                >
                                    Crear Categoría
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
