import EyeButton from '@/components/common/EyeButton';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Sale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Label } from '@radix-ui/react-label';
import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, Eye, Plus, Search, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RangeKeyDict } from 'react-date-range';
import { DateRangePicker, createStaticRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
}

const customStaticRanges = createStaticRanges([
    {
        label: 'Hoy',
        range: () => ({ startDate: new Date(), endDate: new Date() }),
    },
    {
        label: 'Ayer',
        range: () => {
            const yesterday = subDays(new Date(), 1);
            return { startDate: yesterday, endDate: yesterday };
        },
    },
    {
        label: 'Esta semana',
        range: () => ({ startDate: startOfWeek(new Date(), { weekStartsOn: 1 }), endDate: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
    },
    {
        label: 'Últimos 7 días',
        range: () => ({ startDate: subDays(new Date(), 6), endDate: new Date() }),
    },
    {
        label: 'Este mes',
        range: () => ({ startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) }),
    },
    {
        label: 'Mes pasado',
        range: () => {
            const prevMonth = subMonths(new Date(), 1);
            return { startDate: startOfMonth(prevMonth), endDate: endOfMonth(prevMonth) };
        },
    },
    {
        label: 'Este año',
        range: () => ({ startDate: startOfYear(new Date()), endDate: endOfYear(new Date()) }),
    },
]);

const customInputRanges = [
    {
        label: 'Días hasta hoy',
        range(value: number) {
            return {
                startDate: subDays(new Date(), Math.max(Number(value), 1) - 1),
                endDate: new Date(),
            };
        },
        getCurrentValue(range: { startDate?: Date; endDate?: Date }) {
            if (!range.startDate || !range.endDate) return '-';
            return Math.max(1, Math.floor((Number(range.endDate) - Number(range.startDate)) / (1000 * 60 * 60 * 24)) + 1);
        },
    },
    {
        label: 'Días desde hoy',
        range(value: number) {
            return {
                startDate: new Date(),
                endDate: addDays(new Date(), Math.max(Number(value), 1) - 1),
            };
        },
        getCurrentValue(range: { startDate?: Date; endDate?: Date }) {
            if (!range.startDate || !range.endDate) return '-';
            return Math.max(1, Math.floor((Number(range.endDate) - Number(range.startDate)) / (1000 * 60 * 60 * 24)) + 1);
        },
    },
];

interface PageProps {
    sales: {
        data: Sale[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/sales',
    },
];

export default function Index({ sales, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: filters.date_from ? new Date(filters.date_from) : undefined,
        endDate: filters.date_to ? new Date(filters.date_to) : undefined,
        key: 'selection',
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Nuevo efecto: si el buscador queda vacío, limpia los filtros y aplica el estado inicial sin recargar la página
    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters =
                url.searchParams.get('search') ||
                url.searchParams.get('status') ||
                url.searchParams.get('date_from') ||
                url.searchParams.get('date_to');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setStatus('all');
                setDateRange({
                    startDate: undefined,
                    endDate: undefined,
                    key: 'selection',
                });
                applyFilters('', 'all', undefined, undefined);
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const formatDate = (date: Date) => {
        return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        // Aplica el filtro usando router.visit para mantener los filtros y evitar recarga completa
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (newStatus && newStatus !== 'all') params.append('status', newStatus);
        if (dateRange.startDate) params.append('date_from', formatDate(dateRange.startDate));
        if (dateRange.endDate) params.append('date_to', formatDate(dateRange.endDate));
        router.visit(`/sales?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
        });
    };

    const handleDateChange = (ranges: RangeKeyDict) => {
        const { selection } = ranges;
        setDateRange({
            startDate: selection.startDate,
            endDate: selection.endDate,
            key: 'selection',
        });
    };
    const applyFilters = (searchParam = search, statusParam = status, startDate = dateRange.startDate, endDate = dateRange.endDate) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) {
            params.append('search', searchParam);
        }

        if (statusParam && statusParam !== 'all') {
            params.append('status', statusParam);
        }

        if (startDate) {
            params.append('date_from', formatDate(startDate));
        }

        if (endDate) {
            params.append('date_to', formatDate(endDate));
        }

        router.visit(`/sales?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
            onFinish: () => setIsSearching(false),
        });
    };
    const clearFilters = () => {
        setIsSearching(true);
        setSearch('');
        setStatus('all');
        setDateRange({
            startDate: undefined,
            endDate: undefined,
            key: 'selection',
        });
        router.visit('/sales', {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
            onFinish: () => setIsSearching(false),
        });
        window.location.href = '/sales';
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
        }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge className="flex items-center bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="mr-1 size-3.5" />
                        Completada
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="flex items-center bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Clock className="mr-1 size-3.5" />
                        Pendiente
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge className="flex items-center bg-red-100 text-red-800 hover:bg-red-100">
                        <XCircle className="mr-1 size-3.5" />
                        Cancelada
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPaymentMethodText = (method: string) => {
        const methods = {
            cash: 'Efectivo',
            credit_card: 'Tarjeta de crédito',
            debit_card: 'Tarjeta débito',
            transfer: 'Transferencia',
            other: 'Otro',
        };
        return methods[method as keyof typeof methods] || method;
    };

    const formatDateToLocal = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const columns: Column<Sale & { actions: null }>[] = [
        { key: 'code', title: 'Código' },
        { key: 'client', title: 'Cliente', render: (_: unknown, row: Sale) => row.client?.name || 'N/A' },
        { key: 'total', title: 'Total', render: (_: unknown, row: Sale) => <span className="font-semibold">{formatCurrency(row.total)}</span> },
        { key: 'payment_method', title: 'Método de pago', render: (_: unknown, row: Sale) => getPaymentMethodText(row.payment_method) },
        { key: 'date', title: 'Fecha', render: (_: unknown, row: Sale) => formatDateToLocal(row.date) },
        { key: 'status', title: 'Estado', render: (_: unknown, row: Sale) => getStatusBadge(row.status) },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Sale) => (
                <Link href={route('sales.show', row.id)}>
                    <EyeButton text="Ver Venta" />
                </Link>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Administración de Ventas</h1>
                    <Link href={route('sales.create')}>
                        <Button>
                            <Plus className="mr-1 size-4" />
                            Nueva Venta
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtrar Ventas</CardTitle>
                            <CardDescription>Busca ventas por código, cliente o vendedor, estado o rango de fechas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-5">
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

                                <div className="w-full">
                                    <Label htmlFor="product-search" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Estado
                                    </Label>
                                    <Select value={status} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="completed">Completada</SelectItem>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="cancelled">Cancelada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative w-full" ref={datePickerRef}>
                                    <Label htmlFor="date-range" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Rango de fechas
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Seleccionar rango de fechas"
                                        className="w-full cursor-pointer bg-white text-sm text-black md:text-base dark:bg-neutral-800 dark:text-neutral-100"
                                        value={
                                            dateRange.startDate && dateRange.endDate
                                                ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
                                                : ''
                                        }
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        readOnly
                                    />

                                    {showDatePicker && (
                                        <div className="fixed inset-0 z-40 flex items-center justify-center md:absolute md:inset-auto md:right-0 md:z-10 md:mt-2 md:origin-top-right">
                                            <div className="absolute inset-0 bg-black/30 md:hidden" onClick={() => setShowDatePicker(false)}></div>
                                            <div
                                                className="relative mx-2 w-[95vw] max-w-xs overflow-auto rounded-md bg-white p-4 shadow-lg md:max-w-md md:p-0 dark:bg-neutral-800"
                                                style={{ maxHeight: '90vh' }}
                                            >
                                                <DateRangePicker
                                                    ranges={[dateRange]}
                                                    onChange={handleDateChange}
                                                    months={1}
                                                    direction="horizontal"
                                                    rangeColors={['#3b82f6']}
                                                    locale={es}
                                                    staticRanges={customStaticRanges}
                                                    inputRanges={customInputRanges}
                                                />
                                                <div className="flex justify-end gap-2 pt-4">
                                                    <Button size="sm" variant="outline" className="mr-2" onClick={() => setShowDatePicker(false)}>
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setShowDatePicker(false);
                                                            applyFilters();
                                                        }}
                                                    >
                                                        Aplicar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex w-full flex-col justify-end">
                                    <Button variant="outline" onClick={clearFilters}>
                                        Limpiar filtros
                                    </Button>
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

                    {/* Tabla solo visible en escritorio */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={sales.data.map((sale) => ({ ...sale, actions: null }))} />
                    </div>

                    {/* Tarjetas para móvil */}
                    <div className="block md:hidden">
                        {sales.data.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron ventas con los filtros seleccionados</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {[...sales.data]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((sale) => (
                                        <div key={sale.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="text-base font-semibold">{sale.code}</div>
                                                <Link href={route('sales.show', sale.id)}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">Cliente:</span> {sale.client?.name || 'N/A'}
                                            </div>
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">Total:</span> {formatCurrency(sale.total)}
                                            </div>
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">Método de pago:</span> {getPaymentMethodText(sale.payment_method)}
                                            </div>
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">Fecha:</span> {formatDateToLocal(sale.date)}
                                            </div>
                                            <div className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-medium">Estado:</span> {getStatusBadge(sale.status)}
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
                                ...sales,
                                resourceLabel: 'ventas',
                            }}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
