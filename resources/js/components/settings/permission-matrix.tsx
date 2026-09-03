import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

/**
 * Checkbox matrix grouped by module. Checking a permission auto-checks
 * everything it `requires`; unchecking one cascades to uncheck anything
 * that depends on it — a role can never end up holding a permission
 * without its prerequisites, matching what the backend enforces again as
 * a safety net (PermissionCatalog::expandWithDependencies()).
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

    return (
        <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{MODULE_LABELS[module] ?? module}</h3>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(perms).map(([name, meta]) => {
                            const isChecked = selected.has(name);
                            const requires = meta.requires ?? [];
                            const missingDeps = requires.filter((dep) => !selected.has(dep));

                            return (
                                <label key={name} className="flex items-start gap-2 text-sm">
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={disabled}
                                        onCheckedChange={(checked) => toggle(name, checked === true)}
                                        className="mt-0.5"
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
            ))}
        </div>
    );
}
