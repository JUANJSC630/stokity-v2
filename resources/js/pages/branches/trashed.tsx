import PaginationFooter from '@/components/common/PaginationFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, RefreshCcw, Search, Trash2 } from 'lucide-react';
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

export default function TrashedBranches({ branches, filters = { search: '' } }: TrashedBranchesPageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);

    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [branchToRestore, setBranchToRestore] = useState<Branch | null>(null);

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

        router.visit(`/branches/trashed?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['branches'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sucursales Eliminadas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Encabezado y botón volver */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Sucursales Eliminadas</h1>
                    <Button asChild variant="outline" className="flex gap-2">
                        <Link href="/branches">
                            <ChevronLeft className="size-4" />
                            <span>Volver a Sucursales</span>
                        </Link>
                    </Button>
                </div>

                {/* Filtro en Card */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Sucursales Eliminadas</CardTitle>
                            <CardDescription>Busca sucursales eliminadas por nombre, dirección o gerente</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <label htmlFor="branch-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    ref={searchRef}
                                                    type="search"
                                                    placeholder="Buscar por nombre, dirección o gerente"
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
                    <div className="hidden w-full overflow-x-auto md:block">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-neutral-700 dark:text-neutral-200">Nombre</th>
                                    <th className="px-6 py-3 text-left font-medium text-neutral-700 dark:text-neutral-200">Dirección</th>
                                    <th className="px-6 py-3 text-left font-medium text-neutral-700 dark:text-neutral-200">Teléfono</th>
                                    <th className="px-6 py-3 text-left font-medium text-neutral-700 dark:text-neutral-200">Gerente</th>
                                    <th className="px-6 py-3 text-left font-medium text-neutral-700 dark:text-neutral-200">Eliminada</th>
                                    <th className="px-6 py-3 text-right font-medium text-neutral-700 dark:text-neutral-200">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches?.data?.length > 0 ? (
                                    branches.data.map((branch: Branch) => (
                                        <tr key={branch.id} className="border-b last:border-b-0 dark:border-neutral-700">
                                            <td className="px-6 py-2 font-medium">{branch.name}</td>
                                            <td className="px-6 py-2">{branch.address}</td>
                                            <td className="px-6 py-2">{branch.phone}</td>
                                            <td className="px-6 py-2">{branch.manager ? branch.manager.name : '-'}</td>
                                            <td className="px-6 py-2 text-muted-foreground">{formattedDate(branch.deleted_at || '')}</td>
                                            <td className="px-6 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => {
                                                            setBranchToRestore(branch);
                                                            setRestoreModalOpen(true);
                                                        }}
                                                        title="Restaurar"
                                                    >
                                                        <RefreshCcw className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => {
                                                            setBranchToDelete(branch);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        title="Eliminar permanentemente"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                            No hay sucursales eliminadas
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden">
                        {branches?.data?.length > 0 ? (
                            <div className="flex flex-col gap-4 p-2">
                                {branches.data.map((branch: Branch) => (
                                    <div key={branch.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{branch.name}</div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => {
                                                        setBranchToRestore(branch);
                                                        setRestoreModalOpen(true);
                                                    }}
                                                    title="Restaurar"
                                                >
                                                    <RefreshCcw className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => {
                                                        setBranchToDelete(branch);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                    title="Eliminar permanentemente"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Dirección:</span> {branch.address}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Teléfono:</span> {branch.phone}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Gerente:</span> {branch.manager ? branch.manager.name : '-'}
                                        </div>
                                        <div className="mb-1 text-xs">
                                            <span className="inline-block rounded bg-red-100 px-2 py-0.5 font-semibold text-red-700">Eliminada</span>
                                            <span className="ml-2 text-muted-foreground">{formattedDate(branch.deleted_at || '')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted-foreground">No hay sucursales eliminadas</div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div>
                        <PaginationFooter
                            data={{
                                ...branches,
                                resourceLabel: 'sucursales eliminadas',
                            }}
                        />
                    </div>
                </div>

                {/* Diálogo de confirmación para eliminación permanente */}
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

                {/* Diálogo de confirmación para restauración */}
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
