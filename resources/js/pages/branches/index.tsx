import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { AlertTriangle, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BranchesPageProps {
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
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
];

export default function Branches({ branches, filters = { search: '', status: 'all' } }: BranchesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters = url.searchParams.get('search') || url.searchParams.get('status');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setSearch('');
                setStatus('all');
                applyFilters('', 'all');
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const applyFilters = (searchParam = search, statusParam = status) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) {
            params.append('search', searchParam);
        }

        if (statusParam && statusParam !== 'all') {
            params.append('status', statusParam);
        }

        router.visit(`/branches?${params.toString()}`, {
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

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (newStatus && newStatus !== 'all') params.append('status', newStatus);
        router.visit(`/branches?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['branches'],
        });
    };

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

    const columns: Column<Branch & { actions: null }>[] = [
        { key: 'name', title: 'Nombre', render: (_: unknown, row: Branch) => <span className="font-medium">{row.name}</span> },
        { key: 'address', title: 'Dirección' },
        { key: 'phone', title: 'Teléfono' },
        {
            key: 'status',
            title: 'Estado',
            render: (_: unknown, row: Branch) => <Badge variant={row.status ? 'default' : 'destructive'}>{row.status ? 'Activa' : 'Inactiva'}</Badge>,
        },
        {
            key: 'manager',
            title: 'Gerente',
            render: (_: unknown, row: Branch) => (row.manager ? <span>{row.manager.name}</span> : '-'),
        },
        {
            key: 'employees',
            title: 'Empleados',
            render: (_: unknown, row: Branch) => {
                const managerId = row.manager?.id;
                const employeesCount = row.employees ? row.employees.filter((emp) => emp.id !== managerId && emp.role === 'vendedor').length : 0;
                return employeesCount > 0 ? (
                    <span className="text-xs text-muted-foreground">{employeesCount} vendedor(es)</span>
                ) : (
                    <span className="text-xs text-muted-foreground">Sin vendedores</span>
                );
            },
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Branch) => (
                <div className="flex gap-1">
                    <Link href={`/branches/${row.id}`}>
                        <EyeButton text="Ver Sucursal" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Sucursales" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-center text-2xl font-bold sm:text-left">Gestión de Sucursales</h1>
                    <div className="flex flex-row justify-center gap-2">
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

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Productos</CardTitle>
                            <CardDescription>Busca productos por código, nombre, estado, categoría o sucursal</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="product-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    ref={searchRef}
                                                    type="search"
                                                    placeholder="Buscar por código, cliente o vendedor"
                                                    className="h-8 pl-8 text-sm"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="status-filter" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Estado
                                    </Label>
                                    <Select value={status} onValueChange={handleStatusChange}>
                                        <SelectTrigger id="status-filter" className="h-8 text-sm">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="1">Activos</SelectItem>
                                            <SelectItem value="0">Inactivos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    {isSearching && (
                        <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-neutral-900">
                            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-neutral-900 dark:border-neutral-100"></div>
                        </div>
                    )}

                    <div className="hidden w-full overflow-x-auto md:block">
                        <Table columns={columns} data={branches.data.map((branch) => ({ ...branch, actions: null }))} />
                    </div>

                    {/* Tarjetas para móvil */}
                    <div className="block md:hidden">
                        {branches?.data?.length > 0 ? (
                            <div className="flex flex-col gap-4 p-2">
                                {branches.data.map((branch: Branch) => (
                                    <div key={branch.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{branch.name}</div>
                                            <Link href={`/branches/${branch.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <Eye className="size-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Dirección:</span> {branch.address}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Teléfono:</span> {branch.phone}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Estado:</span>{' '}
                                            <Badge variant={branch.status ? 'default' : 'destructive'}>{branch.status ? 'Activa' : 'Inactiva'}</Badge>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Gerente:</span> {branch.manager ? branch.manager.name : '-'}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Empleados:</span>{' '}
                                            {branch.employees
                                                ? (() => {
                                                      const managerId = branch.manager?.id;
                                                      const employeesCount = branch.employees.filter(
                                                          (emp) => emp.id !== managerId && emp.role === 'vendedor',
                                                      ).length;
                                                      return employeesCount > 0 ? `${employeesCount} vendedor(es)` : 'Sin vendedores';
                                                  })()
                                                : 'Sin vendedores'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron sucursales</div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div>
                        <PaginationFooter
                            data={{
                                ...branches,
                                resourceLabel: 'sucursales',
                            }}
                        />
                    </div>
                </div>

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
