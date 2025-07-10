import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, Plus, Search, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RangeKeyDict } from 'react-date-range';
import { DateRangePicker, createStaticRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

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

interface Branch {
    id: number;
    name: string;
}

interface Client {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Sale {
    id: number;
    branch_id: number;
    code: string;
    client_id: number;
    seller_id: number;
    tax: number;
    net: number;
    total: number;
    payment_method: string;
    date: string;
    status: string;
    branch: Branch;
    client: Client;
    seller: User;
}

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

export default function Index({ sales, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: filters.date_from ? new Date(filters.date_from) : undefined,
        endDate: filters.date_to ? new Date(filters.date_to) : undefined,
        key: 'selection',
    });
    const searchRef = useRef<HTMLInputElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Cerrar el date picker al hacer clic fuera de él
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
            // Solo limpiar si no se ha hecho ya y si hay filtros activos
            const url = new URL(window.location.href);
            const hasFilters = url.searchParams.get('search') || url.searchParams.get('status') || url.searchParams.get('date_from') || url.searchParams.get('date_to');
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

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        // Aplicar filtros inmediatamente al cambiar el estado
        applyFilters(search, newStatus, dateRange.startDate, dateRange.endDate);
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

        window.location.href = `/sales?${params.toString()}`;
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setDateRange({
            startDate: undefined,
            endDate: undefined,
            key: 'selection',
        });
        window.location.href = '/sales';
    };

    const formatDate = (date: Date) => {
        return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:gap-8">
                <div className="flex items-center justify-between">
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
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <form onSubmit={handleSearch}>
                                        <div className="relative">
                                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                ref={searchRef}
                                                type="search"
                                                placeholder="Buscar por código, cliente o vendedor"
                                                className="w-full bg-white pl-8 text-black dark:bg-neutral-800 dark:text-neutral-100"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                        </div>
                                    </form>
                                </div>

                                <div>
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

                                <div className="relative" ref={datePickerRef}>
                                    <Input
                                        type="text"
                                        placeholder="Seleccionar rango de fechas"
                                        className="w-full cursor-pointer bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={
                                            dateRange.startDate && dateRange.endDate
                                                ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
                                                : ''
                                        }
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        readOnly
                                    />

                                    {showDatePicker && (
                                        <div className="absolute right-0 z-10 mt-2 origin-top-right rounded-md bg-white shadow-lg dark:bg-neutral-800">
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
                                            <div className="flex justify-end p-2">
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
                                    )}
                                </div>

                                <div className="flex justify-end space-x-2 md:col-span-4">
                                    <Button variant="outline" className="mt-2" onClick={clearFilters}>
                                        Limpiar filtros
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b text-left font-medium">
                                            <th className="px-4 py-2">Código</th>
                                            <th className="px-4 py-2">Cliente</th>
                                            <th className="px-4 py-2">Total</th>
                                            <th className="px-4 py-2">Método de pago</th>
                                            <th className="px-4 py-2">Fecha</th>
                                            <th className="px-4 py-2">Estado</th>
                                            <th className="px-4 py-2">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-6 text-center">
                                                    No se encontraron ventas con los filtros seleccionados
                                                </td>
                                            </tr>
                                        ) : (
                                            [...sales.data]
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map((sale) => (
                                                    <tr key={sale.id} className="border-b">
                                                        <td className="px-4 py-4">{sale.code}</td>
                                                        <td className="px-4 py-4">{sale.client?.name || 'N/A'}</td>
                                                        <td className="px-4 py-4 font-semibold">{formatCurrency(sale.total)}</td>
                                                        <td className="px-4 py-4">{getPaymentMethodText(sale.payment_method)}</td>
                                                        <td className="px-4 py-4">{formatDateToLocal(sale.date)}</td>
                                                        <td className="px-4 py-4">{getStatusBadge(sale.status)}</td>
                                                        <td className="px-4 py-4">
                                                            <Link href={route('sales.show', sale.id)}>
                                                                <Button variant="ghost" size="icon">
                                                                    <Eye className="size-4" />
                                                                </Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {sales.data.length > 0 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Mostrando {sales.from} a {sales.to} de {sales.total} ventas
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {sales.links.map((link, i) => {
                                            if (link.url === null) {
                                                return (
                                                    <Button key={i} variant="ghost" size="icon" disabled className="size-8">
                                                        {i === 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                                    </Button>
                                                );
                                            }

                                            // Removing "Previous" and "Next" from labels
                                            let label = link.label;
                                            if (i === 0 || i === sales.links.length - 1) {
                                                label = '';
                                            }

                                            return (
                                                <Button
                                                    key={i}
                                                    variant={link.url && i === sales.current_page ? 'default' : 'ghost'}
                                                    size={i === 0 || i === sales.links.length - 1 ? 'icon' : 'default'}
                                                    className={i === 0 || i === sales.links.length - 1 ? 'size-8' : 'size-8 px-3'}
                                                    onClick={() => {
                                                        if (link.url) {
                                                            window.location.href = link.url;
                                                        }
                                                    }}
                                                >
                                                    {i === 0 ? (
                                                        <ChevronLeft className="size-4" />
                                                    ) : i === sales.links.length - 1 ? (
                                                        <ChevronRight className="size-4" />
                                                    ) : (
                                                        label
                                                    )}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style>
                {`
              .dark .rdrCalendarWrapper {
                background-color: #262626 !important;
                color: #f3f4f6 !important;
              }
              .dark .rdrMonthAndYearPickers,
              .dark .rdrMonthAndYearWrapper,
              .dark .rdrWeekDays {
                background: #262626 !important;
                color: #f3f4f6 !important;
              }
              .dark .rdrDayNumber span {
                color: #f3f4f6 !important;
              }
              .dark .rdrDayDisabled {
                background: #262626 !important;
                color: #737373 !important;
              }
              .dark .rdrDayToday .rdrDayNumber span {
                border-color: #3b82f6 !important;
              }
              .dark .rdrDayHovered, .dark .rdrDayActive, .dark .rdrInRange, .dark .rdrStartEdge, .dark .rdrEndEdge {
                background: #1e293b !important;
                color: #f3f4f6 !important;
              }
              .dark .rdrSelected, .dark .rdrInRange, .dark .rdrStartEdge, .dark .rdrEndEdge {
                background: #3b82f6 !important;
                color: #fff !important;
              }
              .dark .rdrDateDisplayWrapper {
                background: #262626 !important;
                border-color: #444 !important;
              }
              .dark .rdrDateDisplayItem {
                background: #18181b !important;
                color: #f3f4f6 !important;
                border: 1px solid #444 !important;
              }
              .dark .rdrDateDisplayItem input {
                background: #18181b !important;
                color: #f3f4f6 !important;
                border: none !important;
              }
              .dark .rdrDefinedRangesWrapper {
                background: #18181b !important;
                border-right: 1px solid #444 !important;
              }
              .dark .rdrStaticRangeLabel, .dark .rdrInputRangeInput {
                color: #f3f4f6 !important;
              }
              .dark .rdrStaticRange:hover .rdrStaticRangeLabel, .dark .rdrStaticRange:focus .rdrStaticRangeLabel {
                background: #27272a !important;
                color: #fff !important;
              }
              .dark .rdrStaticRange,
              .dark .rdrStaticRangeLabel {
                background: #18181b !important;
                color: #f3f4f6 !important;
              }
              .dark .rdrStaticRange:focus .rdrStaticRangeLabel,
              .dark .rdrStaticRange:hover .rdrStaticRangeLabel {
                background: #27272a !important;
                color: #fff !important;
              }
              .dark .rdrStaticRange.rdrStaticRangeSelected .rdrStaticRangeLabel {
                background: #3b82f6 !important;
                color: #fff !important;
              }
              .dark .rdrStaticRange.rdrStaticRangeDisabled .rdrStaticRangeLabel {
                background: #18181b !important;
                color: #737373 !important;
                opacity: 0.6 !important;
                cursor: not-allowed !important;
              }
              .dark .rdrInputRangeInput {
                background: #18181b !important;
                color: #f3f4f6 !important;
                border: 1px solid #444 !important;
              }
              .dark .rdrNextPrevButton {
                background: #18181b !important;
                color: #f3f4f6 !important;
                border-radius: 6px !important;
              }
              .dark .rdrNextPrevButton:focus {
                outline: 2px solid #3b82f6 !important;
              }
              .dark .rdrMonthAndYearPickers select {
                background: #18181b !important;
                color: #f3f4f6 !important;
              }
            `}
            </style>
        </AppLayout>
    );
}
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
}
