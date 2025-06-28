import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { BarChart3, LineChart, PieChart, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes de Ventas',
        href: '/report-sales',
    },
];

export default function ReportSales() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes de Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Reportes de Ventas</h1>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex gap-1">
                            <Calendar className="size-4" />
                            <span>Filtrar por Fecha</span>
                        </Button>
                        <Button variant="outline" className="flex gap-1">
                            <Download className="size-4" />
                            <span>Exportar</span>
                        </Button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <ToggleGroup type="single" defaultValue="bar">
                        <ToggleGroupItem value="bar" aria-label="Bar Chart">
                            <BarChart3 className="size-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="line" aria-label="Line Chart">
                            <LineChart className="size-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="pie" aria-label="Pie Chart">
                            <PieChart className="size-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 p-4">
                            <h3 className="font-medium">Ventas Totales</h3>
                            <p className="text-2xl font-bold mt-2">$25,436.00</p>
                        </div>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 p-4">
                            <h3 className="font-medium">Transacciones</h3>
                            <p className="text-2xl font-bold mt-2">1,298</p>
                        </div>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        <div className="relative z-10 p-4">
                            <h3 className="font-medium">Producto Más Vendido</h3>
                            <p className="text-2xl font-bold mt-2">Laptop XYZ</p>
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    <div className="relative z-10 p-6">
                        <h2 className="text-xl font-semibold mb-4 text-center">Gráfico de Ventas</h2>
                        <p className="text-center text-muted-foreground">El gráfico de ventas aparecerá aquí</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
