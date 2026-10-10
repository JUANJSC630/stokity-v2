import { CategoryConfirmDialog } from '@/components/categories/category-dialogs';
import { CategoryCards, CategoryTable, type CategoryAction } from '@/components/categories/category-list';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Recycle, Trash2 } from 'lucide-react';
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
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Categorías', href: '/categories' },
    { title: 'Eliminadas', href: '/categories/trashed' },
];

export default function TrashedCategories({ categories, filters = { search: '' } }: TrashedCategoriesPageProps) {
    const { can } = usePermissions();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [categoryToForceDelete, setCategoryToForceDelete] = useState<Category | null>(null);
    const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [categoryToRestore, setCategoryToRestore] = useState<Category | null>(null);

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

    const actionsFor = (category: Category): CategoryAction[] => [
        ...(can('categories.restore')
            ? [
                  {
                      label: 'Restaurar',
                      icon: <Recycle />,
                      tone: 'accent' as const,
                      onSelect: () => {
                          setCategoryToRestore(category);
                          setRestoreModalOpen(true);
                      },
                  },
              ]
            : []),
        ...(can('categories.delete')
            ? [
                  {
                      label: 'Eliminar permanentemente',
                      icon: <Trash2 />,
                      tone: 'danger' as const,
                      onSelect: () => {
                          setCategoryToForceDelete(category);
                          setForceDeleteModalOpen(true);
                      },
                  },
              ]
            : []),
    ];

    const listProps = {
        categories: categories.data,
        actions: actionsFor,
        dateLabel: 'Eliminada',
        dateOf: (category: Category) => category.deleted_at,
        showStatus: false,
    };

    const blocked = categoryToForceDelete !== null && (categoryToForceDelete.products_count ?? 0) > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías Eliminadas" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/categories"
                        aria-label="Volver a Categorías"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Categorías Eliminadas</h1>
                        <p className="text-sm text-muted-foreground">Restaura una categoría o elimínala para siempre.</p>
                    </div>
                </div>

                <SearchField
                    id="category-search"
                    label="Buscar categorías eliminadas"
                    placeholder="Buscar por nombre de categoría"
                    value={search}
                    onChange={setSearch}
                    onSubmit={() => applyFilters()}
                />

                <div
                    aria-busy={isSearching}
                    className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card transition-opacity',
                        isSearching && 'pointer-events-none opacity-60',
                    )}
                >
                    {categories.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Trash2 className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay categorías eliminadas</p>
                            <p className="text-sm text-muted-foreground">Lo que elimines aparecerá aquí.</p>
                        </div>
                    ) : isWide ? (
                        <CategoryTable {...listProps} />
                    ) : (
                        <CategoryCards {...listProps} visibleActions />
                    )}
                    <PaginationFooter data={{ ...categories, resourceLabel: 'categorías' }} />
                </div>

                <CategoryConfirmDialog
                    open={forceDeleteModalOpen}
                    onOpenChange={setForceDeleteModalOpen}
                    title={blocked ? 'No se puede eliminar' : 'Confirmar eliminación permanente'}
                    tone="danger"
                    cancelLabel="Cerrar"
                    confirmLabel={categoryToForceDelete && !blocked ? 'Eliminar Permanentemente' : undefined}
                    onConfirm={handleForceDelete}
                >
                    {categoryToForceDelete &&
                        (blocked ? (
                            <p>
                                La categoría <strong className="text-foreground">{categoryToForceDelete.name}</strong> tiene{' '}
                                <strong className="text-red-600">{categoryToForceDelete.products_count} producto(s) asociado(s)</strong> (incluyendo
                                eliminados). Debes cambiar la categoría de esos productos o eliminarlos permanentemente primero.
                            </p>
                        ) : (
                            <p>
                                ¿Está seguro de eliminar permanentemente la categoría{' '}
                                <strong className="text-foreground">{categoryToForceDelete.name}</strong>? Esta acción no se puede deshacer.
                            </p>
                        ))}
                </CategoryConfirmDialog>

                <CategoryConfirmDialog
                    open={restoreModalOpen}
                    onOpenChange={setRestoreModalOpen}
                    title="Restaurar Categoría"
                    tone="restore"
                    cancelLabel="Cancelar"
                    confirmLabel="Restaurar"
                    onConfirm={handleRestore}
                >
                    {categoryToRestore && (
                        <p>
                            ¿Desea restaurar la categoría <strong className="text-foreground">{categoryToRestore.name}</strong>?
                        </p>
                    )}
                </CategoryConfirmDialog>
            </div>
        </AppLayout>
    );
}
