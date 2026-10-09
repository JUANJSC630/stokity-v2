import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { endOfMonth, startOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DateRange, type RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { SALE_STATUS_OPTIONS } from './sale-status';

export interface DateSpan {
    startDate?: Date;
    endDate?: Date;
}

interface SalesFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    status: string;
    onStatusChange: (status: string) => void;
    range: DateSpan;
    onRangeChange: (range: DateSpan) => void;
    onClear: () => void;
}

/** Local calendar day as `YYYY-MM-DD`, never shifted by the time zone. */
export function toDateParam(date: Date | undefined): string {
    return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
}

interface Preset {
    id: string;
    label: string;
    span: () => Required<DateSpan>;
}

const PRESETS: Preset[] = [
    { id: 'today', label: 'Hoy', span: () => ({ startDate: new Date(), endDate: new Date() }) },
    { id: 'yesterday', label: 'Ayer', span: () => ({ startDate: subDays(new Date(), 1), endDate: subDays(new Date(), 1) }) },
    { id: 'week', label: '7 días', span: () => ({ startDate: subDays(new Date(), 6), endDate: new Date() }) },
    { id: 'month', label: 'Este mes', span: () => ({ startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) }) },
];

const CHIP =
    'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9 sm:px-3.5';
const CHIP_IDLE = 'border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground';
const CHIP_ON = 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" aria-pressed={active} onClick={onClick} className={cn(CHIP, active ? CHIP_ON : CHIP_IDLE)}>
            {children}
        </button>
    );
}

function activePreset(range: DateSpan): string | null {
    if (!range.startDate || !range.endDate) return null;

    const match = PRESETS.find((preset) => {
        const span = preset.span();
        return toDateParam(span.startDate) === toDateParam(range.startDate) && toDateParam(span.endDate) === toDateParam(range.endDate);
    });

    return match?.id ?? 'custom';
}

function rangeLabel(range: DateSpan): string {
    const format = (date: Date) => date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    if (!range.startDate || !range.endDate) return 'Personalizado';
    return toDateParam(range.startDate) === toDateParam(range.endDate)
        ? format(range.startDate)
        : `${format(range.startDate)} – ${format(range.endDate)}`;
}

export function SalesFilters({ search, onSearchChange, onSearchSubmit, status, onStatusChange, range, onRangeChange, onClear }: SalesFiltersProps) {
    const onBrand = useOnBrandColor();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [draft, setDraft] = useState({ startDate: range.startDate ?? new Date(), endDate: range.endDate ?? new Date(), key: 'selection' });

    const preset = activePreset(range);
    const hasFilters = search.trim() !== '' || status !== 'all' || preset !== null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSearchSubmit();
    };

    const openPicker = () => {
        setDraft({ startDate: range.startDate ?? new Date(), endDate: range.endDate ?? new Date(), key: 'selection' });
        setPickerOpen(true);
    };

    return (
        <section aria-label="Filtros de ventas" className="flex flex-col gap-3">
            <form onSubmit={submit} role="search" className="relative">
                <label htmlFor="sale-search" className="sr-only">
                    Buscar ventas
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                    id="sale-search"
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="Código, cliente o vendedor"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border/60 bg-card pr-12 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                />
                {search && (
                    <button
                        type="button"
                        aria-label="Borrar búsqueda"
                        onClick={() => onSearchChange('')}
                        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground sm:size-9"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                )}
            </form>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
                    {SALE_STATUS_OPTIONS.map((option) => (
                        <Chip key={option.value} active={status === option.value} onClick={() => onStatusChange(option.value)}>
                            {option.label}
                        </Chip>
                    ))}
                </div>

                <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <CalendarDays className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                    {PRESETS.map((item) => (
                        <Chip
                            key={item.id}
                            active={preset === item.id}
                            onClick={() => (preset === item.id ? onRangeChange({}) : onRangeChange(item.span()))}
                        >
                            {item.label}
                        </Chip>
                    ))}
                    <Chip active={preset === 'custom'} onClick={openPicker}>
                        <CalendarDays className="size-4 sm:hidden" aria-hidden="true" />
                        {rangeLabel(preset === 'custom' ? range : {})}
                    </Chip>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="ml-auto inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:h-9"
                        >
                            <X className="size-4" aria-hidden="true" />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="w-[calc(100%-1rem)] max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Rango de fechas</DialogTitle>
                        <DialogDescription>Elige el primer y el último día de las ventas.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center overflow-x-auto rounded-lg bg-white text-neutral-900">
                        <DateRange
                            ranges={[draft]}
                            onChange={(ranges: RangeKeyDict) =>
                                setDraft({
                                    startDate: ranges.selection.startDate ?? draft.startDate,
                                    endDate: ranges.selection.endDate ?? draft.endDate,
                                    key: 'selection',
                                })
                            }
                            months={1}
                            direction="horizontal"
                            rangeColors={['var(--brand-primary)']}
                            locale={es}
                            maxDate={new Date()}
                            showDateDisplay={false}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setPickerOpen(false)}
                            className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:h-9"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onRangeChange({ startDate: draft.startDate, endDate: draft.endDate });
                                setPickerOpen(false);
                            }}
                            className="h-11 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium hover:opacity-90 sm:h-9"
                            style={{ color: onBrand.hex }}
                        >
                            Aplicar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
