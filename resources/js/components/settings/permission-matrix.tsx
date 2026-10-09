import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface PermissionMeta {
    module: string;
    label: string;
    type?: 'action' | 'field';
    requires?: string[];
}

export type PermissionsByModule = Record<string, Record<string, PermissionMeta>>;

const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    pos: 'Punto de venta',
    products: 'Productos',
    categories: 'Categorías',
    clients: 'Clientes',
    sales: 'Ventas',
    credits: 'Créditos',
    suppliers: 'Proveedores',
    stock_movements: 'Movimientos de stock',
    payment_methods: 'Métodos de pago',
    cash_sessions: 'Caja',
    finances: 'Finanzas',
    expenses: 'Gastos',
    reports: 'Reportes',
    users: 'Usuarios',
    branches: 'Sucursales',
    settings: 'Configuración',
};

function flatten(byModule: PermissionsByModule): Record<string, PermissionMeta> {
    const flat: Record<string, PermissionMeta> = {};
    for (const perms of Object.values(byModule)) {
        Object.assign(flat, perms);
    }
    return flat;
}

/** Every permission name currently selected that requires `name`, directly or transitively. */
function dependentsOf(name: string, selected: Set<string>, catalog: Record<string, PermissionMeta>): string[] {
    const dependents: string[] = [];
    const visit = (target: string) => {
        for (const candidate of selected) {
            if (dependents.includes(candidate)) continue;
            if ((catalog[candidate]?.requires ?? []).includes(target)) {
                dependents.push(candidate);
                visit(candidate);
            }
        }
    };
    visit(name);
    return dependents;
}

/** `name` plus every permission it requires, transitively. */
function withDependencies(name: string, catalog: Record<string, PermissionMeta>): string[] {
    const result = new Set<string>([name]);
    const queue = [name];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const dep of catalog[current]?.requires ?? []) {
            if (!result.has(dep)) {
                result.add(dep);
                queue.push(dep);
            }
        }
    }
    return [...result];
}

interface PermissionMatrixProps {
    permissionsByModule: PermissionsByModule;
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    disabled?: boolean;
}

const DESKTOP_MIN_WIDTH = 768;

interface ModuleSectionProps {
    module: string;
    perms: Record<string, PermissionMeta>;
    selected: Set<string>;
    disabled?: boolean;
    onToggle: (name: string, checked: boolean) => void;
    onToggleAll: (names: string[], checked: boolean) => void;
}

function ModuleSection({ module, perms, selected, disabled, onToggle, onToggleAll }: ModuleSectionProps) {
    const names = Object.keys(perms);
    const count = names.filter((name) => selected.has(name)).length;
    const allChecked = count === names.length;
    // Phones start with only the modules that already hold a permission open; larger screens show everything.
    const [open, setOpen] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= DESKTOP_MIN_WIDTH) || count > 0);
    const label = MODULE_LABELS[module] ?? module;
    const panelId = `permissions-${module}`;

    return (
        <section className="rounded-xl border">
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen((current) => !current)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 text-left"
                >
                    <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', !open && '-rotate-90')} />
                    <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
                    <span className={cn('text-xs tabular-nums', count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {count}/{names.length}
                    </span>
                </button>
            </h3>
            {open && (
                <div id={panelId} className="border-t px-3 pb-2">
                    <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggleAll(names, !allChecked)}
                            aria-label={`${allChecked ? 'Quitar todos los permisos de' : 'Seleccionar todos los permisos de'} ${label}`}
                            className="flex min-h-11 items-center px-1 text-xs font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline disabled:opacity-50 sm:min-h-8"
                        >
                            {allChecked ? 'Quitar todo' : 'Seleccionar todo'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(perms).map(([name, meta]) => {
                            const isChecked = selected.has(name);
                            const requires = meta.requires ?? [];
                            const missingDeps = requires.filter((dep) => !selected.has(dep));

                            return (
                                <label key={name} className="flex min-h-11 items-start gap-3 py-2 text-sm sm:min-h-0 sm:gap-2 sm:py-1.5">
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={disabled}
                                        onCheckedChange={(checked) => onToggle(name, checked === true)}
                                        className="mt-0.5 size-5 sm:size-4"
                                    />
                                    <span className="flex flex-col">
                                        <span className="flex items-center gap-1.5">
                                            {meta.label}
                                            {meta.type === 'field' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
                                                            campo
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>No oculta una página — solo un dato sensible dentro de ella.</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </span>
                                        {isChecked && missingDeps.length > 0 && (
                                            <span className="text-xs text-muted-foreground">requiere: {missingDeps.join(', ')}</span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

/**
 * Checkbox matrix grouped by module (collapsible, with a count and a select-all per module).
 * Checking a permission auto-checks everything it `requires`; unchecking one cascades to
 * uncheck anything that depends on it — a role can never end up holding a permission
 * without its prerequisites, matching what the backend enforces again as a safety net
 * (PermissionCatalog::expandWithDependencies()).
 */
export function PermissionMatrix({ permissionsByModule, selected, onChange, disabled }: PermissionMatrixProps) {
    const catalog = flatten(permissionsByModule);

    const toggle = (name: string, checked: boolean) => {
        const next = new Set(selected);
        if (checked) {
            for (const p of withDependencies(name, catalog)) next.add(p);
        } else {
            next.delete(name);
            for (const dependent of dependentsOf(name, selected, catalog)) next.delete(dependent);
        }
        onChange(next);
    };

    const toggleAll = (names: string[], checked: boolean) => {
        const next = new Set(selected);
        for (const name of names) {
            if (checked) {
                for (const p of withDependencies(name, catalog)) next.add(p);
            } else {
                next.delete(name);
                for (const dependent of dependentsOf(name, next, catalog)) next.delete(dependent);
            }
        }
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
                <ModuleSection
                    key={module}
                    module={module}
                    perms={perms}
                    selected={selected}
                    disabled={disabled}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                />
            ))}
        </div>
    );
}
