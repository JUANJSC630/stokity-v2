import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Supplier } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PageProps {
    suppliers: {
        data: Supplier[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    branches: Branch[];
    filters: {
        search?: string;
        status?: string;
        branch?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proveedores', href: '/suppliers' },
];

export default function Index({ suppliers, branches, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [branch, setBranch] = useState(filters.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const hasResetRef = useRef(false);

    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            if (!hasResetRef.current && url.searchParams.get('search')) {
                hasResetRef.current = true;
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
        if (searchParam) params.append('search', searchParam);
        if (status && status !== 'all') params.append('status', status);
        if (branch && branch !== 'all') params.append('branch', branch);

        router.visit(`/suppliers?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['suppliers'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        setIsSearching(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (value !== 'all') params.append('status', value);
        if (branch !== 'all') params.append('branch', branch);
        router.visit(`/suppliers?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['suppliers'],
            onFinish: () => setIsSearching(false),
        });
    };

    const columns: Column<Supplier & { actions: null }>[] = [
        {
            key: 'name',
            title: 'Proveedor',
            render: (_: unknown, row: Supplier) => <span className="font-medium">{row.name}</span>,
        },
        { key: 'nit', title: 'NIT', render: (_: unknown, row: Supplier) => row.nit || '-' },
        { key: 'contact_name', title: 'Contacto', render: (_: unknown, row: Supplier) => row.contact_name || '-' },
        { key: 'phone', title: 'Teléfono', render: (_: unknown, row: Supplier) => row.phone || '-' },
        { key: 'email', title: 'Correo', render: (_: unknown, row: Supplier) => row.email || '-' },
        {
            key: 'status',
            title: 'Estado',
            render: (_: unknown, row: Supplier) =>
                row.status ? (
                    <Badge className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">Activo</Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                ),
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Supplier) => (
                <Link href={route('suppliers.show', row.id)}>
                    <EyeButton text="Ver Proveedor" />
                </Link>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
                    <Link href={route('suppliers.create')}>
                        <Button className="flex gap-1">
                            <Plus className="mr-1 size-4" />
                            Nuevo Proveedor
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtrar Proveedores</CardTitle>
                        <CardDescription>Busca por nombre, NIT, contacto o correo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="col-span-2">
                                <form onSubmit={handleSearch}>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="supplier-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                            Buscar
                                        </Label>
                                        <div className="relative">
                                            <Search className="absolute top-1.5 left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                                            <Input
                                                id="supplier-search"
                                                ref={searchRef}
                                                type="search"
                                                placeholder="Nombre, NIT, contacto, correo..."
                                                className="h-8 pl-8 text-sm"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Estado</Label>
                                    <Select value={status} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="active">Activos</SelectItem>
                                            <SelectItem value="inactive">Inactivos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {branches.length > 0 && (
                                <div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sucursal</Label>
                                        <Select
                                            value={branch}
                                            onValueChange={(value) => {
                                                setBranch(value);
                                                setIsSearching(true);
                                                const params = new URLSearchParams();
                                                if (search) params.append('search', search);
                                                if (status !== 'all') params.append('status', status);
                                                if (value !== 'all') params.append('branch', value);
                                                router.visit(`/suppliers?${params.toString()}`, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                    only: ['suppliers'],
                                                    onFinish: () => setIsSearching(false),
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                {branches.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table
                            columns={columns}
                            data={suppliers.data.map((s) => ({ ...s, actions: null }))}
                            loading={isSearching}
                        />
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden">
                        {suppliers.data.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron proveedores</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {suppliers.data.map((supplier) => (
                                    <div key={supplier.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{supplier.name}</div>
                                            <Link href={route('suppliers.show', supplier.id)}>
                                                <EyeButton text="Ver" />
                                            </Link>
                                        </div>
                                        {supplier.nit && (
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">NIT:</span> {supplier.nit}
                                            </div>
                                        )}
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Contacto:</span> {supplier.contact_name || '-'}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Teléfono:</span> {supplier.phone || '-'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Estado:</span>{' '}
                                            {supplier.status ? (
                                                <span className="text-green-600 dark:text-green-400">Activo</span>
                                            ) : (
                                                <span className="text-neutral-400">Inactivo</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <PaginationFooter data={{ ...suppliers, resourceLabel: 'proveedores' }} />
                </div>
            </div>
        </AppLayout>
    );
}
