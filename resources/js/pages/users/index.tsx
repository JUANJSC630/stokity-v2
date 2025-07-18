import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { Eye, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface UsersPageProps {
    users: {
        data: User[];
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
        title: 'Usuarios',
        href: '/users',
    },
];

export default function Users({ users, filters = { search: '', status: 'all' } }: UsersPageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

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

        router.visit(`/users?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['users'],
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
        router.visit(`/users?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['users'],
        });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'administrador':
                return <Badge className="bg-blue-500 hover:bg-blue-600">Administrador</Badge>;
            case 'encargado':
                return <Badge className="bg-green-500 hover:bg-green-600">Encargado</Badge>;
            case 'vendedor':
                return <Badge className="bg-amber-500 hover:bg-amber-600">Vendedor</Badge>;
            default:
                return <Badge>{role}</Badge>;
        }
    };

    const getStatusBadge = (status: User['status']) => {
        return status ? (
            <Badge className="bg-green-500 hover:bg-green-600">Activo</Badge>
        ) : (
            <Badge className="bg-red-500 hover:bg-red-600">Inactivo</Badge>
        );
    };
console.log(users);
    const columns: Column<User & { actions: null }>[] = [
        { key: 'id', title: 'ID' },
        { key: 'name', title: 'Usuario' },
        { key: 'email', title: 'Email' },
        { key: 'role', title: 'Rol', render: (_: unknown, row: User) => getRoleBadge(row.role) },
        { key: 'status', title: 'Estado', render: (_: unknown, row: User) => getStatusBadge(row.status) },
        { key: 'branch', title: 'Sucursal', render: (_: unknown, row: User) => row.branch?.name || '-' },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: User) => (
                <Link href={`/users/${row.id}`}>
                    <EyeButton text="Ver Usuario" />
                </Link>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                    <div className="flex flex-row justify-center gap-2">
                        <Button asChild className="flex gap-1">
                            <Link href="/users/create">
                                <Plus className="size-4" />
                                <span>Nuevo Usuario</span>
                            </Link>
                        </Button>
                    </div>
                </div>
                {/* Filtro en Card */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Usuarios</CardTitle>
                            <CardDescription>Busca usuarios por nombre, email, estado o sucursal</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="user-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    ref={searchRef}
                                                    type="search"
                                                    placeholder="Buscar por nombre, email o sucursal"
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
                                    <select
                                        id="status-filter"
                                        value={status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="1">Activos</option>
                                        <option value="0">Inactivos</option>
                                    </select>
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

                    {/* Tabla desktop */}
                    <div className="hidden w-full overflow-x-auto md:block">
                        <Table columns={columns} data={users.data.map((user) => ({ ...user, actions: null }))} />
                    </div>

                    {/* Tarjetas móvil */}
                    <div className="block md:hidden">
                        {users.data.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron usuarios</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {users.data.map((user) => (
                                    <div key={user.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{user.name}</div>
                                            <Link href={`/users/${user.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <Eye className="size-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">ID:</span> {user.id}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Email:</span> {user.email}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Rol:</span> {getRoleBadge(user.role)}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Estado:</span> {getStatusBadge(user.status)}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Sucursal:</span> {user.branch?.name || '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Paginación */}
                    <div>
                        <PaginationFooter
                            data={{
                                ...users,
                                resourceLabel: 'usuarios',
                            }}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
