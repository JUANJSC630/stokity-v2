import { usePolling } from '@/hooks/use-polling';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CreditSale, type PaginatedData } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Clock, HandCoins, Plus, Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
    credits: PaginatedData<CreditSale>;
    filters: {
        tab?: string;
        search?: string;
        type?: string;
    };
    overdueCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Créditos', href: '/credits' },
];

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

const TYPE_LABELS: Record<string, string> = {
    layaway: 'Separado',
    installments: 'Cuotas',
    due_date: 'Fecha acordada',
    hold: 'Reservado',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
    active: { label: 'Activo', variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
    overdue: { label: 'Vencido', variant: 'destructive' },
    completed: { label: 'Completado', variant: 'secondary', className: 'bg-green-600 text-white hover:bg-green-700' },
    cancelled: { label: 'Cancelado', variant: 'outline' },
};

const TABS = [
    { key: 'active', label: 'Activos' },
    { key: 'overdue', label: 'Vencidos' },
    { key: 'completed', label: 'Completados' },
    { key: 'all', label: 'Todos' },
];

function ProgressBar({ paid, total }: { paid: number; total: number }) {
    const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs whitespace-nowrap text-muted-foreground">{Math.round(pct)}%</span>
        </div>
    );
}

function DueDateBadge({ dueDate, status }: { dueDate: string | null; status: string }) {
    if (!dueDate || status === 'completed' || status === 'cancelled') return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                Venció hace {Math.abs(diffDays)} día{Math.abs(diffDays) !== 1 ? 's' : ''}
            </span>
        );
    }
    if (diffDays <= 3) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                <Clock className="h-3 w-3" />
                Vence en {diffDays} día{diffDays !== 1 ? 's' : ''}
            </span>
        );
    }
    return <span className="text-xs text-muted-foreground">Vence {format(due, "d 'de' MMM yyyy", { locale: es })}</span>;
}

export default function CreditsIndex({ credits, filters, overdueCount }: Props) {
    usePolling(['credits', 'overdueCount'], 60_000);

    const [search, setSearch] = useState(filters.search ?? '');
    const activeTab = filters.tab ?? 'active';

    function navigate(params: Record<string, string | undefined>) {
        router.get('/credits', { ...filters, ...params }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Créditos" />

            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Créditos</h1>
                        <p className="text-sm text-muted-foreground">Gestiona separados, cuotas y pagos diferidos</p>
                    </div>
                    <Button asChild>
                        <Link href="/credits/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo crédito
                        </Link>
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-lg border p-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => navigate({ tab: tab.key, search: undefined })}
                            className={`relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {tab.label}
                            {tab.key === 'overdue' && overdueCount > 0 && (
                                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                    {overdueCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters */}
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
                    <Select value={filters.type ?? 'all'} onValueChange={(v) => navigate({ type: v === 'all' ? undefined : v })}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Modalidad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las modalidades</SelectItem>
                            <SelectItem value="layaway">Separado</SelectItem>
                            <SelectItem value="installments">Cuotas</SelectItem>
                            <SelectItem value="due_date">Fecha acordada</SelectItem>
                            <SelectItem value="hold">Reservado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Credits list */}
                {credits.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                        <HandCoins className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">
                            No hay créditos {activeTab !== 'all' ? `${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}` : ''}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {credits.data.map((credit) => {
                            const statusCfg = STATUS_CONFIG[credit.status] ?? STATUS_CONFIG.active;
                            return (
                                <Link
                                    key={credit.id}
                                    href={`/credits/${credit.id}`}
                                    className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        {/* Left side */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-sm font-medium">{credit.code}</span>
                                                <Badge variant={statusCfg.variant} className={statusCfg.className}>
                                                    {statusCfg.label}
                                                </Badge>
                                                <Badge variant="outline">{TYPE_LABELS[credit.type] ?? credit.type}</Badge>
                                            </div>
                                            <p className="truncate font-medium">{credit.client?.name ?? 'Sin cliente'}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span>Vendedor: {credit.seller?.name}</span>
                                                <span>{format(new Date(credit.created_at), 'd MMM yyyy', { locale: es })}</span>
                                                <DueDateBadge dueDate={credit.due_date} status={credit.status} />
                                            </div>
                                        </div>

                                        {/* Right side — amounts + progress */}
                                        <div className="w-full space-y-2 sm:w-64">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-sm text-muted-foreground">Pagado</span>
                                                <span className="font-semibold">
                                                    {cop(credit.amount_paid)}{' '}
                                                    <span className="text-xs font-normal text-muted-foreground">/ {cop(credit.total_amount)}</span>
                                                </span>
                                            </div>
                                            <ProgressBar paid={credit.amount_paid} total={credit.total_amount} />
                                            {credit.balance > 0 && (
                                                <p className="text-right text-xs text-muted-foreground">
                                                    Falta: <span className="font-medium text-orange-500">{cop(credit.balance)}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                <PaginationFooter data={{ ...credits, resourceLabel: 'créditos' }} />
            </div>
        </AppLayout>
    );
}
