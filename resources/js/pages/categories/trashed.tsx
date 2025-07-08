import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrashedCategoriesPageProps {
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
    {
        title: 'Eliminadas',
        href: '/categories/trashed',
    },
];

export default function TrashedCategories({
    categories = { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
    filters = { search: '' }
}: TrashedCategoriesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [categoryToForceDelete, setCategoryToForceDelete] = useState<Category | null>(null);
    const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [categoryToRestore, setCategoryToRestore] = useState<Category | null>(null);

    // Update search results when search query changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search) {
                setIsSearching(true);
                router.visit(
                    `/categories/trashed?search=${searchQuery}&page=1`, // Reset to page 1 when search changes
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: false,
                        only: ['categories'],
                        onFinish: () => {
                            setIsSearching(false);
                            console.log('Búsqueda completada');
                        }
                    }
                );
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filters?.search]);

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
            router.put(`/categories/${categoryToRestore.id}/restore`, {}, {
                onSuccess: () => {
                    setRestoreModalOpen(false);
                    setCategoryToRestore(null);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías Eliminadas" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Categorías Eliminadas</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex gap-2 rounded-lg border-gray-200 font-medium shadow-sm hover:bg-gray-50" asChild>
                            <Link href="/categories">
                                <ArrowLeft className="size-4" />
                                <span>Volver a Categorías</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="relative mb-4 w-full max-w-md">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Buscar categorías eliminadas..."
                        className="w-full rounded-lg border-gray-200 pl-10 shadow-sm focus-visible:ring-1 focus-visible:ring-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                    />
                </div>

                <div className="flex-1">
                    <div className="flex flex-wrap gap-3">
                        {categories?.data?.length > 0 ? (
                            categories.data.map((category: Category) => (
                                <div 
                                    key={category.id}
                                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                                    style={{ width: 'fit-content', minWidth: '220px', maxWidth: '100%' }}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="mr-4 text-base font-medium text-gray-900 overflow-visible whitespace-normal">{category.name}</span>
                                        <div className="flex shrink-0 gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 shrink-0 rounded-full p-0 hover:bg-gray-100"
                                                onClick={() => {
                                                    setCategoryToRestore(category);
                                                    setRestoreModalOpen(true);
                                                }}
                                            >
                                                <ArrowLeft className="size-4" />
                                                <span className="sr-only">Restaurar</span>
                                            </Button>
                                            {auth.user.role === 'administrador' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 shrink-0 rounded-full p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => {
                                                        setCategoryToForceDelete(category);
                                                        setForceDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                    <span className="sr-only">Eliminar Permanentemente</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Eliminado el: {new Date(category.deleted_at!).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                                <p className="text-center text-gray-500">
                                    No se encontraron categorías eliminadas
                                </p>
                            </div>
                        )}
                    </div>                    {/* Pagination */}
                    <div className="mt-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="text-sm text-gray-500">
                            Mostrando {categories?.meta?.from || 0} a {categories?.meta?.to || 0} de {categories?.meta?.total || 0} resultados
                        </div>
                        {categories?.meta?.last_page > 1 && (
                            <div className="flex items-center justify-center space-x-1">
                                {/* Previous page button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 min-w-8 rounded-md border-gray-200 px-2 shadow-sm hover:bg-gray-50"
                                    disabled={categories?.meta?.current_page <= 1}
                                    onClick={() => {
                                        console.log('Navegando a la página anterior:', categories?.meta?.current_page - 1);
                                        const prevPage = categories?.meta?.current_page - 1;
                                        router.visit(
                                            `/categories/trashed?page=${prevPage}&search=${searchQuery}`,
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: false,
                                                only: ['categories'],
                                            }
                                        );
                                    }}
                                >
                                    Anterior
                                </Button>
                                
                                {/* Page numbers */}
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, categories?.meta?.last_page || 0) }).map((_, index) => {
                                        let pageNum;
                                        
                                        // Calculate which page numbers to show
                                        if (categories?.meta?.last_page <= 5) {
                                            // If we have 5 or fewer pages, show all of them
                                            pageNum = index + 1;
                                        } else if (categories?.meta?.current_page <= 3) {
                                            // If we're near the beginning, show pages 1-5
                                            pageNum = index + 1;
                                        } else if (categories?.meta?.current_page >= categories?.meta?.last_page - 2) {
                                            // If we're near the end, show the last 5 pages
                                            pageNum = categories?.meta?.last_page - 4 + index;
                                        } else {
                                            // Otherwise show 2 pages before and 2 pages after the current page
                                            pageNum = categories?.meta?.current_page - 2 + index;
                                        }
                                        
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={pageNum === categories?.meta?.current_page ? "default" : "outline"}
                                                size="sm"
                                                className={`h-8 min-w-8 rounded-md px-3 ${
                                                    pageNum === categories?.meta?.current_page 
                                                        ? "bg-black text-white" 
                                                        : "border-gray-200 hover:bg-gray-50"
                                                }`}
                                                onClick={() => {
                                                    if (pageNum !== categories?.meta?.current_page) {
                                                        console.log('Navegando a la página:', pageNum);
                                                        router.visit(
                                                            `/categories/trashed?page=${pageNum}&search=${searchQuery}`,
                                                            {
                                                                preserveState: true,
                                                                preserveScroll: true,
                                                                replace: false,
                                                                only: ['categories'],
                                                            }
                                                        );
                                                    }
                                                }}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                
                                {/* Next page button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 min-w-8 rounded-md border-gray-200 px-2 shadow-sm hover:bg-gray-50"
                                    disabled={categories?.meta?.current_page >= categories?.meta?.last_page}
                                    onClick={() => {
                                        console.log('Navegando a la página siguiente:', categories?.meta?.current_page + 1);
                                        const nextPage = categories?.meta?.current_page + 1;
                                        router.visit(
                                            `/categories/trashed?page=${nextPage}&search=${searchQuery}`,
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: false,
                                                only: ['categories'],
                                            }
                                        );
                                    }}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Force Delete Confirmation Dialog */}
                <Dialog open={forceDeleteModalOpen} onOpenChange={setForceDeleteModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                                <AlertTriangle className="size-5 text-red-500" />
                                Confirmar eliminación permanente
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-gray-600">
                            {categoryToForceDelete && (
                                <p>
                                    ¿Está seguro de eliminar permanentemente la categoría <strong className="text-gray-900">{categoryToForceDelete.name}</strong>? Esta acción no se puede deshacer.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button 
                                variant="ghost" 
                                className="rounded-lg border border-gray-200 hover:bg-gray-50"
                                onClick={() => setForceDeleteModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="destructive" 
                                className="rounded-lg bg-red-500 hover:bg-red-600"
                                onClick={handleForceDelete}
                            >
                                Eliminar Permanentemente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Restore Confirmation Dialog */}
                <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-gray-900">
                                Restaurar Categoría
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-gray-600">
                            {categoryToRestore && (
                                <p>
                                    ¿Desea restaurar la categoría <strong className="text-gray-900">{categoryToRestore.name}</strong>?
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter className="flex gap-3 pt-2">
                            <Button 
                                variant="ghost" 
                                className="rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                onClick={() => setRestoreModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                className="rounded-lg bg-black font-medium hover:bg-gray-800"
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
