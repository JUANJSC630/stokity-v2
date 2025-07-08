import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Search, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BranchesPageProps {
    branches?: {
        data: Branch[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        }
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

export default function Branches({ branches = { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 }}, filters = { search: '', status: '' } }: BranchesPageProps) {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'all');
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search || selectedStatus !== filters?.status) {
                router.get('/branches', {
                    search: searchQuery,
                    status: selectedStatus,
                    page: 1, // Reset to page 1 when search criteria changes
                }, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
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
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Gestión de Sucursales</h1>
                    <div className="flex gap-2">
                        {auth.user.role === 'admin' && (
                            <Button asChild className="flex gap-1">
                                <Link href="/branches/create">
                                    <Plus className="size-4" />
                                    <span>Nueva Sucursal</span>
                                </Link>
                            </Button>
                        )}
                        {auth.user.role === 'admin' && (
                            <Button variant="outline" asChild>
                                <Link href="/branches/trashed">
                                    <Trash2 className="size-4 mr-2" />
                                    <span>Sucursales Eliminadas</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar sucursales..."
                            className="w-full pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="w-full max-w-xs">
                        <Select
                            value={selectedStatus}
                            onValueChange={setSelectedStatus}
                        >
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

                <Card className="overflow-hidden">
                    <CardHeader className="p-4 bg-muted/50">
                        <div className="grid grid-cols-12 gap-2 font-semibold text-sm">
                            <div className="col-span-3">Nombre</div>
                            <div className="col-span-3">Dirección</div>
                            <div className="col-span-2">Teléfono</div>
                            <div className="col-span-2">Estado</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {branches?.data?.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                No se encontraron sucursales
                            </div>
                        ) : (
                            branches?.data?.map((branch: Branch) => (
                                <div 
                                    key={branch.id}
                                    className="grid grid-cols-12 gap-2 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="col-span-3 font-medium">
                                        {branch.name}
                                        {branch.manager && (
                                            <div className="text-xs text-muted-foreground">
                                                Gerente: {branch.manager.name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-3 text-sm">{branch.address}</div>
                                    <div className="col-span-2 text-sm">{branch.phone}</div>
                                    <div className="col-span-2">
                                        <Badge variant={branch.status ? "default" : "destructive"}>
                                            {branch.status ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        {auth.user.role === 'admin' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/branches/${branch.id}/edit`}>
                                                            <Edit className="size-4 mr-2" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => {
                                                            setBranchToDelete(branch);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="size-4 mr-2" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {branches?.meta?.last_page > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {branches?.data?.length} de {branches?.meta?.total} sucursales
                        </div>
                        <div className="flex gap-2">
                            {Array.from({length: branches?.meta?.last_page || 0}, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={page === branches?.meta?.current_page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.get('/branches', {
                                        page,
                                        search: searchQuery,
                                        status: selectedStatus,
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    })}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
                
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
                                    ¿Está seguro de eliminar la sucursal <strong>{branchToDelete.name}</strong>? 
                                    Esta acción puede ser revertida posteriormente.
                                </p>
                            )}
                        </DialogDescription>
                        <DialogFooter>
                            <Button
                                variant="ghost" 
                                onClick={() => setDeleteModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
