import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import EyeButton from '@/components/common/EyeButton';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuarios',
        href: '/users',
    },
];

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: { url: string | null; label: string; active: boolean }[];
};

interface Props {
    users: PaginatedData<User>;
    filters: {
        search?: string;
    };
}

export default function Users({ users, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== filters.search) {
                setIsSearching(true);
                router.get(
                    '/users',
                    { search, page: 1 }, // Reset to page 1 when search criteria changes
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onFinish: () => setIsSearching(false),
                    },
                );
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, filters.search]);

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
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                    <Link href="/users/create">
                        <Button className="flex gap-1">
                            <Plus className="size-4" />
                            <span>Nuevo Usuario</span>
                        </Button>
                    </Link>
                </div>

                <div className="relative mb-4 w-full max-w-sm">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar usuarios..."
                        className="w-full pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={isSearching}
                    />
                </div>

                <Card className="flex-1 overflow-hidden">
                    <div className="hidden overflow-x-auto md:block">
                        <Table
                            columns={columns}
                            data={users.data.map((user) => ({
                                ...user,
                                actions: null,
                            }))}
                        />
                        {users.data.length === 0 && (
                            <div className="px-4 py-6 text-center">
                                <p className="text-muted-foreground">No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>

                    {/* Tarjetas para móvil */}
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

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {users.from} a {users.to} de {users.total} resultados
                            </div>
                            <div className="flex space-x-1">
                                {users.current_page > 1 && (
                                    <Link href={`/users?page=${users.current_page - 1}&search=${search}`} preserveScroll preserveState>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                            <ChevronLeft className="size-4" />
                                            <span className="sr-only">Página anterior</span>
                                        </Button>
                                    </Link>
                                )}

                                {users.current_page < users.last_page && (
                                    <Link href={`/users?page=${users.current_page + 1}&search=${search}`} preserveScroll preserveState>
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
            </div>
        </AppLayout>
    );
}
