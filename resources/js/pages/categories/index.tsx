import { CategoryConfirmDialog, CategoryNameDialog } from '@/components/categories/category-dialogs';
import { CategoryCards, CategoryTable, type CategoryAction } from '@/components/categories/category-list';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Categorías', href: '/categories' },
];

const formatCount = (value: number): string => String(value);

export default function Categories({ categories, filters = { search: '' } }: CategoriesPageProps) {
    const { can } = usePermissions();
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    usePolling(['categories'], 120_000);

    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    // Separate form instances to avoid shared-state issues between create and edit
    const createForm = useForm({ name: '' });
    const editForm = useForm({ name: '' });

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
        editForm.setData('name', category.name);
        setEditModalOpen(true);
    };

    // Handle form submission for editing
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (categoryToEdit) {
            editForm.put(`/categories/${categoryToEdit.id}`, {
                onSuccess: () => {
                    setEditModalOpen(false);
                    setCategoryToEdit(null);
                    editForm.reset();
                },
            });
        }
    };

    // Handle form submission for creating
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/categories', {
            preserveState: false,
            onSuccess: () => {
                setCreateModalOpen(false);
            },
        });
    };

    // Open create modal and reset form
    const openCreateModal = () => {
        createForm.reset();
        setCreateModalOpen(true);
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['categories'], onFinish: () => resolve() });
            }),
        [],
    );

    const actionsFor = (category: Category): CategoryAction[] => [
        ...(can('categories.update')
            ? [{ label: 'Editar', icon: <Pencil />, tone: 'neutral' as const, onSelect: () => openEditModal(category) }]
            : []),
        ...(can('categories.delete')
            ? [
                  {
                      label: 'Eliminar',
                      icon: <Trash2 />,
                      tone: 'danger' as const,
                      onSelect: () => {
                          setCategoryToDelete(category);
                          setDeleteModalOpen(true);
                      },
                  },
              ]
            : []),
    ];

    const listProps = {
        categories: categories.data,
        actions: actionsFor,
        dateLabel: 'Creada',
        dateOf: (category: Category) => category.created_at,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gestión de Categorías</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={categories.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {categories.total === 1 ? 'categoría' : 'categorías'} para organizar tu catálogo
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('categories.delete') && (
                            <Link
                                href="/categories/trashed"
                                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Categorías Eliminadas</span>
                                <span className="sr-only sm:hidden">Categorías Eliminadas</span>
                            </Link>
                        )}
                        {can('categories.create') && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10 sm:flex-none"
                                style={{ color: onBrand.hex }}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Nueva Categoría
                            </button>
                        )}
                    </div>
                </div>

                <SearchField
                    id="category-search"
                    label="Buscar categorías"
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
                                <Tags className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No se encontraron categorías</p>
                            <p className="text-sm text-muted-foreground">Prueba con otro nombre o crea una nueva.</p>
                        </div>
                    ) : isWide ? (
                        <CategoryTable {...listProps} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <CategoryCards {...listProps} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...categories, resourceLabel: 'categorías' }} />
                </div>

                <CategoryConfirmDialog
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                    title="Confirmar eliminación"
                    tone="danger"
                    cancelLabel="Cancelar"
                    confirmLabel="Eliminar"
                    onConfirm={handleDelete}
                >
                    {categoryToDelete && (
                        <p>
                            ¿Está seguro de eliminar la categoría <strong className="text-foreground">{categoryToDelete.name}</strong>? Esta acción
                            puede ser revertida posteriormente.
                        </p>
                    )}
                </CategoryConfirmDialog>

                <CategoryNameDialog
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                    title="Editar Categoría"
                    description="Actualiza el nombre de la categoría y haz clic en guardar cuando termines."
                    submitLabel="Guardar cambios"
                    idPrefix="edit-"
                    value={editForm.data.name}
                    onChange={(value) => editForm.setData('name', value)}
                    error={editForm.errors.name}
                    processing={editForm.processing}
                    onSubmit={handleEditSubmit}
                />

                <CategoryNameDialog
                    open={createModalOpen}
                    onOpenChange={setCreateModalOpen}
                    title="Crear Nueva Categoría"
                    description="Ingresa el nombre de la nueva categoría y haz clic en guardar."
                    submitLabel="Crear Categoría"
                    idPrefix="create-"
                    value={createForm.data.name}
                    onChange={(value) => createForm.setData('name', value)}
                    error={createForm.errors.name}
                    processing={createForm.processing}
                    onSubmit={handleCreateSubmit}
                />
            </div>
        </AppLayout>
    );
}
