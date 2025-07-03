import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Trash2, ChevronLeft, RefreshCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface TrashedBranchesPageProps {
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

export default function TrashedBranches({ branches = { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 }}, filters = { search: '' } }: TrashedBranchesPageProps) {
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [branchToRestore, setBranchToRestore] = useState<Branch | null>(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== filters?.search) {
                router.get('/branches/trashed', {
                    search: searchQuery,
                }, {
                    preserveState: true,
                    replace: true,
                });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filters?.search]);

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
            router.put(`/branches/${branchToRestore.id}/restore`, {}, {
                preserveScroll: true,
            });
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
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/branches">
                            <Button variant="ghost" size="icon">
                                <ChevronLeft className="size-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Sucursales Eliminadas</h1>
                    </div>
                </div>

                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar en papelera..."
                        className="w-full pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Card className="overflow-hidden">
                    <CardHeader className="p-4 bg-muted/50">
                        <div className="grid grid-cols-12 gap-2 font-semibold text-sm">
                            <div className="col-span-3">Nombre</div>
                            <div className="col-span-3">Dirección</div>
                            <div className="col-span-2">Teléfono</div>
                            <div className="col-span-2">Eliminada</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {branches?.data?.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                No hay sucursales eliminadas
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
                                    <div className="col-span-2 text-sm text-muted-foreground">
                                        {formattedDate(branch.deleted_at || '')}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
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
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {branches?.meta?.last_page > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {branches?.data?.length} de {branches?.meta?.total} sucursales eliminadas
                        </div>
                        <div className="flex gap-2">
                            {Array.from({length: branches?.meta?.last_page || 0}, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={page === branches?.meta?.current_page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => router.get('/branches/trashed', {
                                        page,
                                        search: searchQuery,
                                    }, {
                                        preserveState: true,
                                    })}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
                
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
                                    ¿Está seguro de eliminar permanentemente la sucursal <strong>{branchToDelete.name}</strong>? 
                                    Esta acción <strong>no puede ser revertida</strong>.
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
                                onClick={handleForceDelete}
                            >
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
                            <Button
                                variant="ghost" 
                                onClick={() => setRestoreModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleRestore}
                            >
                                Restaurar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
