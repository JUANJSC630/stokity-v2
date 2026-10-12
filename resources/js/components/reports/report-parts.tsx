import { INPUT_CLASS, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { Download, FileSpreadsheet, ListFilter, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/** Title of a report with its two exports (Excel and PDF) one tap away. */
export function ReportHeader({ title, subtitle, onExport }: { title: string; subtitle?: string; onExport: (type: 'excel' | 'pdf') => void }) {
    const onBrand = useOnBrandColor();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                    type="button"
                    onClick={() => onExport('excel')}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium hover:bg-muted sm:h-10"
                >
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    Exportar Excel
                </button>
                <button
                    type="button"
                    onClick={() => onExport('pdf')}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                    style={{ color: onBrand.hex }}
                >
                    <Download className="size-4" aria-hidden="true" />
                    Exportar PDF
                </button>
            </div>
        </div>
    );
}

interface FilterPanelProps {
    title?: string;
    description?: string;
    onApply: () => void;
    activeCount?: number;
    applyLabel?: string;
    children: ReactNode;
}

/** The filters of a report: always open on a wide screen, folded behind one button (with a count) on a phone. */
export function ReportFilterPanel({
    title = 'Filtros',
    description,
    onApply,
    activeCount = 0,
    applyLabel = 'Aplicar Filtros',
    children,
}: FilterPanelProps) {
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [open, setOpen] = useState(false);

    return (
        <section aria-label={title} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
            {isWide ? (
                <div>
                    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
            ) : (
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="report-filter-fields"
                    onClick={() => setOpen((value) => !value)}
                    className="flex h-11 items-center justify-between gap-2 text-sm font-medium"
                >
                    <span className="flex items-center gap-2">
                        <ListFilter className="size-4" aria-hidden="true" />
                        {title}
                        {activeCount > 0 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                {activeCount} activo{activeCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </span>
                </button>
            )}
            {(isWide || open) && (
                <>
                    <div id="report-filter-fields" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {children}
                    </div>
                    <div className="flex sm:justify-end">
                        <button
                            type="button"
                            onClick={() => onApply()}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10 sm:w-auto"
                            style={{ color: onBrand.hex }}
                        >
                            <Search className="size-4" aria-hidden="true" />
                            {applyLabel}
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

export function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
                {label}
            </label>
            <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
        </div>
    );
}

export function FilterSelect({
    id,
    label,
    value,
    onChange,
    allLabel,
    options,
    className,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    allLabel?: string;
    options: Array<{ value: string; label: string }>;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
                {label}
            </label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
                    <SelectValue placeholder={allLabel} />
                </SelectTrigger>
                <SelectContent>
                    {allLabel && <SelectItem value="all">{allLabel}</SelectItem>}
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/** A figure of the report: what it is, the number, and a short line saying what it counts. */
export function ReportKpi({
    label,
    children,
    hint,
    icon,
    tone,
}: {
    label: string;
    children: ReactNode;
    hint?: ReactNode;
    icon?: ReactNode;
    tone?: string;
}) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                {icon && (
                    <span className="text-muted-foreground/60" aria-hidden="true">
                        {icon}
                    </span>
                )}
            </div>
            <p className={cn('mt-1 text-xl font-bold tracking-tight tabular-nums sm:text-2xl', tone)}>{children}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

export interface ReportColumn<T> {
    key: string;
    header: string;
    cell: (row: T) => ReactNode;
    align?: 'left' | 'right' | 'center';
    /** Where the column goes on a phone card: the main line, a muted line under it, the figure on the right, a labeled detail, or nowhere. */
    mobile?: 'title' | 'subtitle' | 'value' | 'detail' | 'hide';
}

interface ReportTableProps<T> {
    caption: string;
    rows: T[];
    columns: ReportColumn<T>[];
    rowKey: (row: T, index: number) => string | number;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/** One list of rows that is a table on a wide screen and a stack of cards on a phone, so no report needs two copies of its markup. */
export function ReportTable<T>({ caption, rows, columns, rowKey }: ReportTableProps<T>) {
    const isWide = useMediaQuery('(min-width: 768px)');

    if (isWide) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label={caption}>
                    <thead>
                        <tr className="border-y border-border/60 text-[11px] tracking-wide text-muted-foreground uppercase">
                            {columns.map((column, index) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className={cn(
                                        'px-3 py-3 font-medium',
                                        ALIGN[column.align ?? 'left'],
                                        index === 0 && 'pl-5',
                                        index === columns.length - 1 && 'pr-5',
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {rows.map((row, rowIndex) => (
                            <tr key={rowKey(row, rowIndex)} className="hover:bg-muted/40">
                                {columns.map((column, index) => (
                                    <td
                                        key={column.key}
                                        className={cn(
                                            'px-3 py-3 tabular-nums',
                                            ALIGN[column.align ?? 'left'],
                                            index === 0 && 'pl-5',
                                            index === columns.length - 1 && 'pr-5',
                                        )}
                                    >
                                        {column.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    const by = (kind: NonNullable<ReportColumn<T>['mobile']>) => columns.filter((column) => (column.mobile ?? 'detail') === kind);

    return (
        <ul className="divide-y divide-border/40 border-t border-border/60" aria-label={caption}>
            {rows.map((row, rowIndex) => (
                <li key={rowKey(row, rowIndex)} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {by('title').map((column) => (
                            <div key={column.key} className="text-[15px] leading-tight font-semibold">
                                {column.cell(row)}
                            </div>
                        ))}
                        {by('subtitle').map((column) => (
                            <div key={column.key} className="truncate text-xs text-muted-foreground">
                                {column.cell(row)}
                            </div>
                        ))}
                        {by('detail').length > 0 && (
                            <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                                {by('detail').map((column) => (
                                    <span key={column.key}>
                                        {column.header}: <span className="font-medium text-foreground">{column.cell(row)}</span>
                                    </span>
                                ))}
                            </p>
                        )}
                    </div>
                    <div className="shrink-0 text-right text-[15px] font-bold tabular-nums">
                        {by('value').map((column) => (
                            <div key={column.key}>{column.cell(row)}</div>
                        ))}
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Words when a section has no rows. */
export function ReportEmpty({ children }: { children: ReactNode }) {
    return <p className="px-5 pb-6 text-center text-sm text-muted-foreground">{children}</p>;
}
