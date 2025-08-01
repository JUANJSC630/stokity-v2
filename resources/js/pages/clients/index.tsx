import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Client } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { Eye, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PageProps {
    clients: {
        data: Client[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
];

export default function Index({ clients, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
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

        router.visit(`/clients?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['clients'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const columns: Column<Client & { actions: null }>[] = [
        { key: 'name', title: 'Nombre', render: (_: unknown, row: Client) => <span className="font-medium">{row.name}</span> },
        { key: 'document', title: 'Documento' },
        { key: 'phone', title: 'Teléfono', render: (_: unknown, row: Client) => row.phone || '-' },
        { key: 'email', title: 'Correo', render: (_: unknown, row: Client) => row.email || '-' },
        { key: 'address', title: 'Dirección', render: (_: unknown, row: Client) => row.address || '-' },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Client) => (
                <div className="flex items-center gap-2">
                    <Link href={route('clients.show', row.id)}>
                        <EyeButton text="Ver Cliente" />
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
                    <Link href={route('clients.create')}>
                        <Button className="flex gap-1">
                            <Plus className="mr-1 size-4" />
                            Nuevo Cliente
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Clientes</CardTitle>
                            <CardDescription>Busca clientes por código, nombre o correo electrónico</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-5">
                                <div className="col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="client-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                                <Input
                                                    id="client-search"
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

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={clients.data.map((client) => ({ ...client, actions: null }))} />
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden">
                        {clients.data.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron clientes</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {clients.data.map((client) => (
                                    <div key={client.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{client.name}</div>
                                            <div className="flex items-center gap-1">
                                                <Link href={route('clients.show', client.id)}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Documento:</span> {client.document}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Teléfono:</span> {client.phone || '-'}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Correo:</span> {client.email || '-'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Dirección:</span> {client.address || '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div>
                        <PaginationFooter
                            data={{
                                ...clients,
                                resourceLabel: 'clientes',
                            }}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
