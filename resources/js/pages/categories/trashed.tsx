import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
    filters = { search: '' },
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
                    `/categories/trashed?search=${encodeURIComponent(searchQuery)}&page=1`, // Reset to page 1 when search changes
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías Eliminadas" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 dark:bg-neutral-900/50" style={{ minHeight: 'calc(100vh - 64px)' }}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Categorías Eliminadas</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex gap-2 rounded-lg border-neutral-200 font-medium shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" asChild>
                            <Link href="/categories">
                                <ArrowLeft className="size-4" />
                                <span>Volver a Categorías</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="relative mb-4 w-full max-w-md">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                    <Input
                        placeholder="Buscar categorías eliminadas..."
                        className="w-full rounded-lg border-neutral-200 pl-10 shadow-sm focus-visible:ring-1 focus-visible:ring-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isSearching}
                    />
                </div>

                <div className="flex flex-1 flex-col">
                    {/* Content area with min-height to ensure pagination stays at bottom */}
                    <div className="flex-grow" style={{ minHeight: '300px' }}>
                        <div className="flex flex-wrap gap-2">
                            {categories?.data?.length > 0 ? (
                                categories.data.map((category: Category) => (
                                    <div
                                        key={category.id}
                                        className="inline-flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500"
                                        style={{ width: 'fit-content', minWidth: '160px', maxWidth: '100%' }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="mr-2 overflow-visible text-sm font-medium whitespace-normal text-neutral-900 dark:text-neutral-100">
                                                {category.name}
                                            </span>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Eliminado:{' '}
                                                {new Date(category.deleted_at!).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 shrink-0 rounded-full p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                                onClick={() => {
                                                    setCategoryToRestore(category);
                                                    setRestoreModalOpen(true);
                                                }}
                                            >
                                                <ArrowLeft className="size-3.5" />
                                                <span className="sr-only">Restaurar</span>
                                            </Button>
                                            {auth.user.role === 'administrador' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 shrink-0 rounded-full p-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900 dark:hover:text-red-300"
                                                    onClick={() => {
                                                        setCategoryToForceDelete(category);
                                                        setForceDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    <span className="sr-only">Eliminar Permanentemente</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                                    <p className="text-center text-neutral-500 dark:text-neutral-400">No se encontraron categorías eliminadas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination - always at bottom */}
                    <div className="mt-auto border-t border-neutral-100 pt-5 dark:border-neutral-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                Mostrando <span className="font-medium text-neutral-700 dark:text-neutral-200">{categories?.meta?.from || 0}</span> a{' '}
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{categories?.meta?.to || 0}</span> de{' '}
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{categories?.meta?.total || 0}</span> resultados
                            </div>
                            {categories?.meta?.last_page > 1 && (
                                <nav className="flex items-center gap-x-1">
                                    {/* Previous page button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 w-8 rounded-md p-0 ${categories?.meta?.current_page <= 1 ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-500 dark:text-neutral-200'}`}
                                        disabled={categories?.meta?.current_page <= 1}
                                        onClick={() => {
                                            const prevPage = categories?.meta?.current_page - 1;
                                            router.visit(`/categories/trashed?page=${prevPage}&search=${encodeURIComponent(searchQuery || '')}`, {
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
                                                        className="h-8 w-8 rounded-md border-neutral-200 p-0 dark:border-neutral-700"
                                                        onClick={() => {
                                                            router.visit(
                                                                `/categories/trashed?page=1&search=${encodeURIComponent(searchQuery || '')}`,
                                                                {
                                                                    preserveState: true,
                                                                    preserveScroll: true,
                                                                    only: ['categories'],
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        <span>1</span>
                                                    </Button>,
                                                );

                                                // Add ellipsis if needed
                                                if (currentPage > 4) {
                                                    pages.push(
                                                        <span key="ellipsis-start" className="mx-1 text-neutral-400 dark:text-neutral-600">
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
                                                            i === currentPage
                                                                ? 'bg-black text-white dark:bg-neutral-100 dark:text-neutral-900'
                                                                : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'
                                                        }`}
                                                        onClick={() => {
                                                            if (i !== currentPage) {
                                                                router.visit(
                                                                    `/categories/trashed?page=${i}&search=${encodeURIComponent(searchQuery || '')}`,
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
                                                    <span key="ellipsis-end" className="mx-1 text-neutral-400 dark:text-neutral-600">
                                                        ...
                                                    </span>,
                                                );

                                                // Always show last page
                                                pages.push(
                                                    <Button
                                                        key={lastPage}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 rounded-md border-neutral-200 p-0 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                                                        onClick={() => {
                                                            router.visit(
                                                                `/categories/trashed?page=${lastPage}&search=${encodeURIComponent(searchQuery || '')}`,
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
                                        className={`h-8 w-8 rounded-md p-0 ${categories?.meta?.current_page >= categories?.meta?.last_page ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-500 dark:text-neutral-200'}`}
                                        disabled={categories?.meta?.current_page >= categories?.meta?.last_page}
                                        onClick={() => {
                                            const nextPage = categories?.meta?.current_page + 1;
                                            router.visit(`/categories/trashed?page=${nextPage}&search=${encodeURIComponent(searchQuery || '')}`, {
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

                {/* Force Delete Confirmation Dialog */}
                <Dialog open={forceDeleteModalOpen} onOpenChange={setForceDeleteModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:bg-neutral-900 dark:border-neutral-700">
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
                                    <strong className="text-neutral-900 dark:text-neutral-100">{categoryToForceDelete.name}</strong>? Esta acción no se puede deshacer.
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
                            <Button variant="destructive" className="rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800" onClick={handleForceDelete}>
                                Eliminar Permanentemente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Restore Confirmation Dialog */}
                <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
                    <DialogContent className="rounded-lg p-6 shadow-lg sm:max-w-md dark:bg-neutral-900 dark:border-neutral-700">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Restaurar Categoría</DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="py-4 text-neutral-600 dark:text-neutral-300">
                            {categoryToRestore && (
                                <p>
                                    ¿Desea restaurar la categoría <strong className="text-neutral-900 dark:text-neutral-100">{categoryToRestore.name}</strong>?
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
                            <Button className="rounded-lg bg-black font-medium hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200" onClick={handleRestore}>
                                Restaurar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
