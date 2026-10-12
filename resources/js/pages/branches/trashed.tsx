import { BranchAvatar } from '@/components/branches/branch-meta';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TrashedBranchesPageProps {
    branches: {
        data: Branch[];
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
        title: 'Sucursales',
        href: '/branches',
    },
    {
        title: 'Sucursales Eliminadas',
        href: '/branches/trashed',
    },
];

const formattedDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function TrashedBranches({ branches, filters = { search: '' } }: TrashedBranchesPageProps) {
    const isWide = useMediaQuery('(min-width: 768px)');
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [branchToRestore, setBranchToRestore] = useState<Branch | null>(null);

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

        router.visit(`/branches/trashed?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['branches'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleForceDelete = () => {
        if (branchToDelete) {
            router.delete(`/branches/${branchToDelete.id}/force-delete`, {
                preserveScroll: true,
            });
            setDeleteModalOpen(false);
            setBranchToDelete(null);
        }
    };

    const handleRestore = () => {
        if (branchToRestore) {
            router.put(
                `/branches/${branchToRestore.id}/restore`,
                {},
                {
                    preserveScroll: true,
                },
            );
            setRestoreModalOpen(false);
            setBranchToRestore(null);
        }
    };

    const askRestore = (branch: Branch) => {
        setBranchToRestore(branch);
        setRestoreModalOpen(true);
    };

    const askForceDelete = (branch: Branch) => {
        setBranchToDelete(branch);
        setDeleteModalOpen(true);
    };

    const actionButton = 'flex size-11 items-center justify-center rounded-xl border border-border/60 transition-colors hover:bg-muted sm:size-9';

    const Actions = ({ branch }: { branch: Branch }) => (
        <div className="flex items-center justify-end gap-2">
            {can('branches.restore') && (
                <button type="button" aria-label="Restaurar" title="Restaurar" onClick={() => askRestore(branch)} className={actionButton}>
                    <RefreshCcw className="size-4" />
                </button>
            )}
            {can('branches.delete') && (
                <button
                    type="button"
                    aria-label="Eliminar permanentemente"
                    title="Eliminar permanentemente"
                    onClick={() => askForceDelete(branch)}
                    className={cn(
                        actionButton,
                        'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30',
                    )}
                >
                    <Trash2 className="size-4" />
                </button>
            )}
        </div>
    );

    const isEmpty = !(branches?.data?.length > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sucursales Eliminadas" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Sucursales Eliminadas</h1>
                        <p className="text-sm text-muted-foreground">Restáuralas o elimínalas para siempre</p>
                    </div>
                    <Link
                        href="/branches"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted sm:h-10"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        <span>Volver a Sucursales</span>
                    </Link>
                </div>

                <SearchField
                    id="branch-search"
                    label="Buscar sucursales eliminadas"
                    placeholder="Buscar por nombre, dirección o gerente"
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
                    {isEmpty ? (
                        <div className="px-6 py-16 text-center text-muted-foreground">No hay sucursales eliminadas</div>
                    ) : isWide ? (
                        <table className="w-full text-sm" aria-label="Sucursales eliminadas">
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Nombre
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Dirección
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Teléfono
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Gerente
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Eliminada
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right font-medium">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {branches.data.map((branch: Branch) => (
                                    <tr key={branch.id}>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <BranchAvatar />
                                                <span className="font-medium">{branch.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">{branch.address}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{branch.phone}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{branch.manager ? branch.manager.name : '-'}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{formattedDate(branch.deleted_at || '')}</td>
                                        <td className="px-6 py-3">
                                            <Actions branch={branch} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {branches.data.map((branch: Branch) => (
                                <li key={branch.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex items-start gap-3">
                                        <BranchAvatar />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{branch.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{branch.address}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {branch.phone} · {branch.manager ? branch.manager.name : '-'}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                                    Eliminada
                                                </span>
                                                <span className="ml-2 text-muted-foreground">{formattedDate(branch.deleted_at || '')}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Actions branch={branch} />
                                </li>
                            ))}
                        </ul>
                    )}
                    <PaginationFooter data={{ ...branches, resourceLabel: 'sucursales eliminadas' }} />
                </div>

                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-destructive" />
                                Confirmar eliminación permanente
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            {branchToDelete && (
                                <p>
                                    ¿Está seguro de eliminar permanentemente la sucursal <strong>{branchToDelete.name}</strong>? Esta acción{' '}
                                    <strong>no puede ser revertida</strong>.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleForceDelete}>
                                Eliminar permanentemente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmar restauración</DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            {branchToRestore && (
                                <p>
                                    ¿Desea restaurar la sucursal <strong>{branchToRestore.name}</strong>?
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setRestoreModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleRestore}>Restaurar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
