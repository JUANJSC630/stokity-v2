import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CategoriesPageProps {
    categories?: {
        data: Category[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number;
            to: number;
        };
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

export default function Categories({
    categories = { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
    filters = { search: '' },
}: CategoriesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    // Inertia form for editing and creating
    const form = useForm({
        name: '',
    });

    // Update search results when search query changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search) {
                setIsSearching(true);
                router.visit(
                    `/categories?search=${encodeURIComponent(searchQuery)}&page=1`, // Reset to page 1 when search changes
                    {
                        preserveState: true,
                        preserveScroll: true,
                        only: ['categories'],
                        onFinish: () => {
                            setIsSearching(false);
                        },
                    },
                );
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filters?.search]);

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

    // Debug pagination data
    console.log('Categories data:', categories);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4" style={{ minHeight: "calc(100vh - 64px)" }}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h1>

                    <div className="flex flex-wrap gap-3">
                        {(auth.user.role === 'administrador' || auth.user.role === 'encargado') && (
                            <Button className="flex gap-2 rounded-lg bg-black font-medium shadow-sm hover:bg-gray-800" onClick={openCreateModal}>
                                <Plus className="size-4" />
                                <span>Nueva Categoría</span>
                            </Button>
                        )}
                        {auth.user.role === 'administrador' && (
                            <Button
                                variant="outline"
                                className="flex gap-2 rounded-lg border-gray-200 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                asChild
                            >
                                <Link href="/categories/trashed">
                                    <Trash2 className="size-4" />
                                    <span>Categorías Eliminadas</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative mb-4 w-full max-w-md">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Buscar categorías..."
                        className="w-full rounded-lg border-gray-200 pl-10 shadow-sm focus-visible:ring-1 focus-visible:ring-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                    />
                </div>

                <div className="flex flex-1 flex-col">
                    {/* Content area with min-height to ensure pagination stays at bottom */}
                    <div className="flex-grow" style={{ minHeight: "300px" }}>
                        <div className="flex flex-wrap gap-2">
                            {categories?.data?.length > 0 ? (
                                categories.data.map((category: Category) => (
                                    <div
                                        key={category.id}
                                        className="inline-flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                                        style={{ width: 'fit-content', minWidth: '160px', maxWidth: '100%' }}
                                    >
                                        <span className="mr-2 overflow-visible text-sm font-medium whitespace-normal text-gray-900">
                                            {category.name}
                                        </span>
                                        <div className="flex shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 shrink-0 rounded-full p-0 hover:bg-gray-100"
                                                onClick={() => openEditModal(category)}
                                            >
                                                <Edit2 className="size-3.5" />
                                                <span className="sr-only">Editar</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 shrink-0 rounded-full p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => {
                                                    setCategoryToDelete(category);
                                                    setDeleteModalOpen(true);
                                                }}
                                            >
                                                <Trash2 className="size-3.5" />
                                                <span className="sr-only">Eliminar</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                                    <p className="text-center text-gray-500">No se encontraron categorías</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Pagination - always at bottom */}
                    <div className="mt-auto border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Mostrando <span className="font-medium text-gray-700">{categories?.meta?.from || 0}</span> a{' '}
                                <span className="font-medium text-gray-700">{categories?.meta?.to || 0}</span> de{' '}
                                <span className="font-medium text-gray-700">{categories?.meta?.total || 0}</span> resultados
                            </div>

                            {categories?.meta?.last_page > 1 && (
                                <nav className="flex items-center gap-x-1">
                                    {/* Previous page button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 w-8 rounded-md p-0 ${categories?.meta?.current_page <= 1 ? 'text-gray-300' : 'text-gray-500'}`}
                                        disabled={categories?.meta?.current_page <= 1}
                                        onClick={() => {
                                            const prevPage = categories?.meta?.current_page - 1;
                                            router.visit(`/categories?page=${prevPage}&search=${encodeURIComponent(searchQuery || '')}`, {
                                                preserveState: true,
                                                preserveScroll: true,
                                                only: ['categories'],
                                            });
                                        }}
                                    >
                                        <span className="sr-only">Página anterior</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </Button>

                                    {/* Page numbers */}
                                    <div className="flex items-center">
                                        {(() => {
                                            const currentPage = categories?.meta?.current_page || 1;
                                            const lastPage = categories?.meta?.last_page || 1;
                                            const pages = [];

                                            // Show first page if we're not at the beginning
                                            if (currentPage > 3) {
                                                pages.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 rounded-md border-gray-200 p-0"
                                                        onClick={() => {
                                                            router.visit(`/categories?page=1&search=${encodeURIComponent(searchQuery || '')}`, {
                                                                preserveState: true,
                                                                preserveScroll: true,
                                                                only: ['categories'],
                                                            });
                                                        }}
                                                    >
                                                        <span>1</span>
                                                    </Button>,
                                                );

                                                // Add ellipsis if needed
                                                if (currentPage > 4) {
                                                    pages.push(
                                                        <span key="ellipsis-start" className="mx-1 text-gray-400">
                                                            ...
                                                        </span>,
                                                    );
                                                }
                                            }

                                            // Calculate range of pages to show
                                            const startPage = Math.max(1, currentPage - 1);
                                            const endPage = Math.min(lastPage, currentPage + 1);

                                            // Add page numbers
                                            for (let i = startPage; i <= endPage; i++) {
                                                pages.push(
                                                    <Button
                                                        key={i}
                                                        variant={i === currentPage ? 'default' : 'outline'}
                                                        size="sm"
                                                        className={`h-8 w-8 rounded-md p-0 ${
                                                            i === currentPage ? 'bg-black text-white' : 'border-gray-200 text-gray-700'
                                                        }`}
                                                        onClick={() => {
                                                            if (i !== currentPage) {
                                                                router.visit(
                                                                    `/categories?page=${i}&search=${encodeURIComponent(searchQuery || '')}`,
                                                                    {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                        only: ['categories'],
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <span>{i}</span>
                                                    </Button>,
                                                );
                                            }

                                            // Add ellipsis if needed
                                            if (currentPage < lastPage - 2) {
                                                pages.push(
                                                    <span key="ellipsis-end" className="mx-1 text-gray-400">
                                                        ...
                                                    </span>,
                                                );

                                                // Always show last page
                                                pages.push(
                                                    <Button
                                                        key={lastPage}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 rounded-md border-gray-200 p-0 text-gray-700"
                                                        onClick={() => {
                                                            router.visit(
                                                                `/categories?page=${lastPage}&search=${encodeURIComponent(searchQuery || '')}`,
                                                                {
                                                                    preserveState: true,
                                                                    preserveScroll: true,
                                                                    only: ['categories'],
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        <span>{lastPage}</span>
                                                    </Button>,
                                                );
                                            }

                                            return pages;
                                        })()}
                                    </div>

                                    {/* Next page button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 w-8 rounded-md p-0 ${categories?.meta?.current_page >= categories?.meta?.last_page ? 'text-gray-300' : 'text-gray-500'}`}
                                        disabled={categories?.meta?.current_page >= categories?.meta?.last_page}
                                        onClick={() => {
                                            const nextPage = categories?.meta?.current_page + 1;
                                            router.visit(`/categories?page=${nextPage}&search=${encodeURIComponent(searchQuery || '')}`, {
                                                preserveState: true,
                                                preserveScroll: true,
                                                only: ['categories'],
                                            });
                                        }}
                                    >
                                        <span className="sr-only">Página siguiente</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Button>
                                </nav>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                                <AlertTriangle className="size-5 text-red-500" />
                                Confirmar eliminación
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-gray-600">
                            {categoryToDelete && (
                                <p>
                                    ¿Está seguro de eliminar la categoría <strong className="text-gray-900">{categoryToDelete.name}</strong>? Esta
                                    acción puede ser revertida posteriormente.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="rounded-lg border border-gray-200 hover:bg-gray-50"
                                onClick={() => setDeleteModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button variant="destructive" className="rounded-lg bg-red-500 hover:bg-red-600" onClick={handleDelete}>
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Category Dialog */}
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-gray-900">Editar Categoría</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500">
                                Actualiza el nombre de la categoría y haz clic en guardar cuando termines.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <Input
                                    id="name"
                                    placeholder="Nombre de la categoría"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="rounded-md border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                />
                                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                            </div>
                            <DialogFooter className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => setEditModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={form.processing} className="rounded-lg bg-black font-medium hover:bg-gray-800">
                                    Guardar cambios
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Create Category Dialog */}
                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-gray-900">Crear Nueva Categoría</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500">
                                Ingresa el nombre de la nueva categoría y haz clic en guardar.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="create-name" className="text-sm font-medium text-gray-700">
                                    Nombre
                                </label>
                                <Input
                                    id="create-name"
                                    placeholder="Nombre de la categoría"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="rounded-md border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                                    autoFocus
                                />
                                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                            </div>
                            <DialogFooter className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={() => setCreateModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={form.processing} className="rounded-lg bg-black font-medium hover:bg-gray-800">
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
