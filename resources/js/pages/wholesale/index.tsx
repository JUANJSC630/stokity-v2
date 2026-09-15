import PaginationFooter from '@/components/common/PaginationFooter';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem, type PaginatedData, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Gem, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    wholesaleSales: PaginatedData<WholesaleSale>;
    filters: {
        search?: string;
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Mayorista', href: '/wholesale' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
    completed: { label: 'Completado', variant: 'secondary', className: 'bg-green-600 text-white hover:bg-green-700' },
    cancelled: { label: 'Cancelado', variant: 'outline' },
};

export default function WholesaleIndex({ wholesaleSales, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');

    function navigate(params: Record<string, string | undefined>) {
        router.get('/wholesale', { ...filters, ...params }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mayorista" />

            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mayorista</h1>
                        <p className="text-sm text-muted-foreground">Pedidos personalizados fuera del catálogo e inventario normal</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('wholesale.view_deleted') && (
                            <Button variant="outline" size="sm" className="text-muted-foreground" asChild>
                                <Link href="/wholesale/deleted">
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Eliminados
                                </Link>
                            </Button>
                        )}
                        <Button asChild>
                            <Link href="/wholesale/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo pedido
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código o cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && navigate({ search: search || undefined })}
                            className="pl-9"
                        />
                    </div>
                    <Select value={filters.status ?? 'all'} onValueChange={(v) => navigate({ status: v === 'all' ? undefined : v })}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {wholesaleSales.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                        <Gem className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">No hay pedidos mayoristas registrados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {wholesaleSales.data.map((order) => {
                            const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.completed;
                            return (
                                <Link
                                    key={order.id}
                                    href={`/wholesale/${order.id}`}
                                    className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-sm font-medium">{order.code}</span>
                                                <Badge variant={statusCfg.variant} className={statusCfg.className}>
                                                    {statusCfg.label}
                                                </Badge>
                                            </div>
                                            <p className="truncate font-medium">{order.client?.name ?? 'Sin cliente'}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span>Vendedor: {order.seller?.name}</span>
                                                <span>{format(new Date(order.date), 'd MMM yyyy', { locale: es })}</span>
                                                <span className="capitalize">{order.payment_method}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                <PaginationFooter data={{ ...wholesaleSales, resourceLabel: 'pedidos mayoristas' }} />
            </div>
        </AppLayout>
    );
}
