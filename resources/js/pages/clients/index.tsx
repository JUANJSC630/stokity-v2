import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Client {
    id: number;
    name: string;
    document: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    birthdate: string | null;
    created_at: string;
    updated_at: string;
}

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
    clients: PaginatedData<Client>;
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

export default function Clients({ clients, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [filters.search]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== filters.search) {
                setIsSearching(true);
                router.get(
                    '/clients',
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
                    <Link href={route('clients.create')}>
                        <Button className="flex gap-1">
                            <Plus className="size-4" />
                            <span>Nuevo Cliente</span>
                        </Button>
                    </Link>
                </div>

                <div className="relative mb-4 w-full max-w-sm">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Buscar clientes..."
                        className="w-full pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={isSearching}
                    />
                </div>

                <Card className="flex-1 overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr className="border-b text-left">
                                    <th className="px-4 py-3 text-sm font-medium">Nombre</th>
                                    <th className="px-4 py-3 text-sm font-medium">Documento</th>
                                    <th className="px-4 py-3 text-sm font-medium">Teléfono</th>
                                    <th className="px-4 py-3 text-sm font-medium">Correo</th>
                                    <th className="px-4 py-3 text-sm font-medium">Dirección</th>
                                    <th className="px-4 py-3 text-sm font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.data.map((client) => (
                                    <tr key={client.id} className="border-b hover:bg-muted/20">
                                        <td className="px-4 py-3 text-sm font-medium">{client.name}</td>
                                        <td className="px-4 py-3 text-sm">{client.document}</td>
                                        <td className="px-4 py-3 text-sm">{client.phone || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{client.email || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{client.address || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Link href={route('clients.show', client.id)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <Eye className="size-4" />
                                                        <span className="sr-only">Ver Cliente</span>
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {clients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center">
                                            <p className="text-muted-foreground">No se encontraron clientes</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
                    {clients.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {clients.from} a {clients.to} de {clients.total} resultados
                            </div>
                            <div className="flex space-x-1">
                                {clients.current_page > 1 && (
                                    <Link href={`/clients?page=${clients.current_page - 1}&search=${search}`} preserveScroll preserveState>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                            <ChevronLeft className="size-4" />
                                            <span className="sr-only">Página anterior</span>
                                        </Button>
                                    </Link>
                                )}

                                {clients.current_page < clients.last_page && (
                                    <Link href={`/clients?page=${clients.current_page + 1}&search=${search}`} preserveScroll preserveState>
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
