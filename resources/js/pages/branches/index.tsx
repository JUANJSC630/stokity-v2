import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BranchesPageProps {
    branches?: {
        data: Branch[];
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
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
];

export default function Branches({
    branches = { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
    filters = { search: '', status: '' },
}: BranchesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'all');
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search || selectedStatus !== filters?.status) {
                setIsSearching(true);
                router.get(
                    '/branches',
                    {
                        search: searchQuery,
                        status: selectedStatus,
                        page: 1, // Reset to page 1 when search criteria changes
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                        onFinish: () => setIsSearching(false),
                    },
                );
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedStatus, filters?.search, filters?.status]);

    const handleDelete = () => {
        if (branchToDelete) {
            router.delete(`/branches/${branchToDelete.id}`, {
                onSuccess: () => {
                    setDeleteModalOpen(false);
                    setBranchToDelete(null);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Sucursales" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Gestión de Sucursales</h1>
                    <div className="flex gap-2">
                        {auth.user.role === 'administrador' && (
                            <Button asChild className="flex gap-1">
                                <Link href="/branches/create">
                                    <Plus className="size-4" />
                                    <span>Nueva Sucursal</span>
                                </Link>
                            </Button>
                        )}
                        {auth.user.role === 'administrador' && (
                            <Button variant="outline" asChild>
                                <Link href="/branches/trashed">
                                    <Trash2 className="mr-2 size-4" />
                                    <span>Sucursales Eliminadas</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar sucursales..."
                            className="w-full pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={isSearching}
                        />
                    </div>

                    <div className="w-full max-w-xs">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isSearching}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activas</SelectItem>
                                <SelectItem value="inactive">Inactivas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="flex-1 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr className="border-b text-left">
                                    <th className="px-4 py-3 text-sm font-medium">Nombre</th>
                                    <th className="px-4 py-3 text-sm font-medium">Dirección</th>
                                    <th className="px-4 py-3 text-sm font-medium">Teléfono</th>
                                    <th className="px-4 py-3 text-sm font-medium">Estado</th>
                                    <th className="px-4 py-3 text-sm font-medium">Gerente</th>
                                    <th className="px-4 py-3 text-sm font-medium">Empleados</th>
                                    <th className="px-4 py-3 text-sm font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches?.data?.length > 0 ? (
                                    branches?.data?.map((branch: Branch) => (
                                        <tr key={branch.id} className="border-b hover:bg-muted/20">
                                            <td className="px-4 py-3 text-sm font-medium">{branch.name}</td>
                                            <td className="px-4 py-3 text-sm">{branch.address}</td>
                                            <td className="px-4 py-3 text-sm">{branch.phone}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge variant={branch.status ? 'default' : 'destructive'}>
                                                    {branch.status ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {branch.manager ? (
                                                    <div className="flex items-center gap-2">
                                                        <span>{branch.manager.name}</span>
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {branch.employees ? (
                                                    (() => {
                                                        // Filter out the branch manager from the employees count
                                                        const managerId = branch.manager?.id;
                                                        const employeesCount = branch.employees.filter(
                                                            // Only count employees that are not the manager
                                                            (emp) => emp.id !== managerId && emp.role === 'vendedor',
                                                        ).length;

                                                        return employeesCount > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs text-muted-foreground">{employeesCount} vendedor(es)</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Sin vendedores</span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sin vendedores</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex gap-1">
                                                    <Link href={`/branches/${branch.id}`}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Eye className="size-4" />
                                                            <span className="sr-only">Ver Sucursal</span>
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center">
                                            <p className="text-muted-foreground">No se encontraron sucursales</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {branches?.meta?.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {branches?.meta?.from} a {branches?.meta?.to} de {branches?.meta?.total} resultados
                            </div>
                            <div className="flex space-x-1">
                                {branches?.meta?.current_page > 1 && (
                                    <Link
                                        href={`/branches?page=${branches?.meta?.current_page - 1}&search=${searchQuery}&status=${selectedStatus}`}
                                        preserveScroll
                                        preserveState
                                    >
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                            <ChevronLeft className="size-4" />
                                            <span className="sr-only">Página anterior</span>
                                        </Button>
                                    </Link>
                                )}

                                {branches?.meta?.current_page < branches?.meta?.last_page && (
                                    <Link
                                        href={`/branches?page=${branches?.meta?.current_page + 1}&search=${searchQuery}&status=${selectedStatus}`}
                                        preserveScroll
                                        preserveState
                                    >
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                            <ChevronRight className="size-4" />
                                            <span className="sr-only">Página siguiente</span>
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-destructive" />
                                Confirmar eliminación
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription>
                            {branchToDelete && (
                                <p>
                                    ¿Está seguro de eliminar la sucursal <strong>{branchToDelete.name}</strong>? Esta acción puede ser revertida
                                    posteriormente.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
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
