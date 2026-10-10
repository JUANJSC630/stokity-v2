import { downloadFile } from '@/lib/download';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export interface ReportFilters {
    [key: string]: string | undefined;
    date_from?: string;
    date_to?: string;
    branch_id?: string;
    seller_id?: string;
    category_id?: string;
    status?: string;
}

export interface ReportUser {
    is_admin: boolean;
    branch_id?: number;
    branch_name?: string;
}

interface Options {
    /** Where the report lives, e.g. `/reports/products`. */
    path: string;
    /** Where its exports live, e.g. `/reports/products/export`. */
    exportBase: string;
    filters: ReportFilters;
    /** When given, a user who is not an administrator is held to their own branch. */
    user?: ReportUser;
}

/** The filters every report shares, how they are sent to the server and how the same filters become an Excel or PDF download. */
export function useReportFilters({ path, exportBase, filters, user }: Options) {
    const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);
    const [dateRange, setDateRange] = useState({
        from: filters.date_from || '',
        to: filters.date_to || '',
    });

    const build = (): ReportFilters => {
        const next = {
            ...localFilters,
            date_from: dateRange.from,
            date_to: dateRange.to,
        };

        if (next.branch_id === 'all') delete next.branch_id;
        if (next.category_id === 'all') delete next.category_id;

        // Para usuarios no administradores, forzar el filtro de sucursal
        if (user && !user.is_admin && user.branch_id) {
            next.branch_id = user.branch_id.toString();
        }

        return next;
    };

    const applyFilters = () => {
        router.get(path, build(), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const exportReport = async (type: 'excel' | 'pdf' = 'excel') => {
        const next = build();
        const url = new URL(`${exportBase}/${type}`, window.location.origin);
        Object.keys(next).forEach((key) => {
            if (next[key as keyof ReportFilters]) {
                url.searchParams.append(key, next[key as keyof ReportFilters]!);
            }
        });

        try {
            await downloadFile(url.toString());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al generar el archivo');
        }
    };

    const setFilter = (key: keyof ReportFilters, value: string) => {
        setLocalFilters((prev) => ({ ...prev, [key]: value === 'all' ? undefined : value }));
    };

    const activeCount = [dateRange.from, dateRange.to, localFilters.branch_id, localFilters.category_id].filter(Boolean).length;

    return { localFilters, setLocalFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount };
}
