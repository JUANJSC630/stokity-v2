import { CardCreateClient } from '@/components/clients';
import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { INPUT_CLASS, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { DragStepper } from '@/components/ui/bencho/drag-stepper';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { type Branch, type Client } from '@/types';
import { router } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';

export interface WholesaleItemInput {
    description: string;
    quantity: number;
    unit_price: number;
}

export interface WholesaleFormValues {
    branch_id: string;
    client_id: string;
    payment_method: string;
    date: string;
    notes: string;
    estimated_cost: number;
    items: WholesaleItemInput[];
}

interface Props {
    clients: Client[];
    branches: Branch[];
    initialValues: WholesaleFormValues;
    submitUrl: string;
    submitMethod: 'post' | 'put';
    submitLabel: string;
    errors?: Record<string, string>;
}

interface Props {
    clients: Client[];
    branches: Branch[];
    initialValues: WholesaleFormValues;
    submitUrl: string;
    submitMethod: 'post' | 'put';
    submitLabel: string;
    errors?: Record<string, string>;
}

const formatCount = (value: number): string => String(value);

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card">
            <header className="px-5 pt-4 pb-3">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </header>
            <div className="px-5 pb-5">{children}</div>
        </section>
    );
}

function Field({
    id,
    label,
    required,
    error,
    children,
    className,
}: {
    id?: string;
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className ?? 'space-y-1.5'}>
            <label htmlFor={id} className="text-xs font-medium">
                {label}
                {required && (
                    <span aria-hidden="true" className="text-red-500">
                        {' '}
                        *
                    </span>
                )}
            </label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

const emptyItem: WholesaleItemInput = { description: '', quantity: 1, unit_price: 0 };

export default function WholesaleOrderForm({ clients, branches, initialValues, submitUrl, submitMethod, submitLabel, errors = {} }: Props) {
    const [values, setValues] = useState<WholesaleFormValues>(initialValues);
    const [showCreateClient, setShowCreateClient] = useState(false);
    const [processing, setProcessing] = useState(false);

    const total = values.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    function updateItem(index: number, patch: Partial<WholesaleItemInput>) {
        setValues((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    }

    function addItem() {
        setValues((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
    }

    function removeItem(index: number) {
        setValues((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (values.items.length === 0 || values.items.some((item) => !item.description.trim() || item.quantity < 1)) {
            toast.error('Agrega al menos una línea con descripción y cantidad válidas.');
            return;
        }

        setProcessing(true);
        const payload = {
            branch_id: values.branch_id,
            client_id: values.client_id,
            payment_method: values.payment_method,
            date: values.date,
            notes: values.notes,
            estimated_cost: values.estimated_cost || null,
            items: values.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })),
        };
        router[submitMethod](submitUrl, payload, {
            onError: (formErrors) => {
                Object.values(formErrors).forEach((msg) => msg && toast.error(String(msg)));
            },
            onFinish: () => setProcessing(false),
        });
    }

    const onBrand = useOnBrandColor();
    const unitCount = values.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
                <DialogContent className="max-w-lg md:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <CardCreateClient
                        variant="wholesale"
                        onSuccess={() => {
                            setShowCreateClient(false);
                            toast.success('Cliente creado correctamente');
                            router.reload({ only: ['clients'] });
                        }}
                        onCancel={() => setShowCreateClient(false)}
                    />
                </DialogContent>
            </Dialog>

            <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
                <div className="flex min-w-0 flex-col gap-5">
                    <Panel title="Datos del pedido">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {branches.length > 1 && (
                                <Field id="branch_id" label="Sucursal" required error={errors.branch_id}>
                                    <Select value={values.branch_id} onValueChange={(v) => setValues((prev) => ({ ...prev, branch_id: v }))}>
                                        <SelectTrigger id="branch_id" className={`${SELECT_TRIGGER} [&>span]:truncate`}>
                                            <SelectValue placeholder="Seleccione sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}

                            <Field id="client_id" label="Cliente" required error={errors.client_id}>
                                <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <Select value={values.client_id} onValueChange={(v) => setValues((prev) => ({ ...prev, client_id: v }))}>
                                            <SelectTrigger id="client_id" className={`${SELECT_TRIGGER} [&>span]:truncate`}>
                                                <SelectValue placeholder="Seleccione cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id.toString()}>
                                                        {client.name}
                                                        {client.is_wholesale ? ' · Mayorista' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <button
                                        aria-label="Crear cliente"
                                        type="button"
                                        onClick={() => setShowCreateClient(true)}
                                        title="Crear cliente"
                                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </Field>

                            <PaymentMethodSelect
                                value={values.payment_method || undefined}
                                onValueChange={(v) => setValues((prev) => ({ ...prev, payment_method: v }))}
                                error={errors.payment_method}
                                required
                                triggerClassName="h-11 text-base sm:h-9 sm:text-sm"
                            />

                            <Field id="date" label="Fecha del pedido" required error={errors.date}>
                                <input
                                    id="date"
                                    type="date"
                                    className={INPUT_CLASS}
                                    value={values.date}
                                    onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
                                    required
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel
                        title="Artículos del pedido"
                        description="Una línea por cada tipo de artículo. Describe cualquier detalle personalizado (color, material, etc.) en la descripción."
                    >
                        <div className="flex flex-col gap-3">
                            <div className="hidden gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_11.5rem_9.5rem_7rem_auto]">
                                <span>Descripción del artículo</span>
                                <span>Cantidad</span>
                                <span>Precio unitario</span>
                                <span className="text-right">Subtotal</span>
                                <span className="w-9" />
                            </div>

                            {values.items.map((item, index) => (
                                <StaggerItem key={index} index={0}>
                                    <div className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border/60 bg-background p-3 sm:grid-cols-[1fr_11.5rem_9.5rem_7rem_auto] sm:border-0 sm:bg-transparent sm:p-0">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground sm:hidden">Descripción del artículo</span>
                                            <input
                                                className={INPUT_CLASS}
                                                placeholder="Ej: Manillas negras, pepas color verde a pedido"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground sm:hidden">Cantidad</span>
                                            <DragStepper
                                                value={item.quantity}
                                                onChange={(v) => updateItem(index, { quantity: v })}
                                                label={item.description.trim() ? `de ${item.description.trim()}` : `del artículo ${index + 1}`}
                                                placeholder="1"
                                                className="w-full"
                                                height={44}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground sm:hidden">Precio unitario</span>
                                            <CurrencyInput
                                                className={INPUT_CLASS}
                                                value={item.unit_price}
                                                onChange={(v) => updateItem(index, { unit_price: v })}
                                                placeholder="Precio por unidad"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between sm:block sm:text-right">
                                            <span className="text-xs text-muted-foreground sm:hidden">Subtotal</span>
                                            <span className="text-base font-bold tabular-nums sm:text-sm sm:font-semibold">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <button
                                                aria-label="Quitar este artículo"
                                                type="button"
                                                disabled={values.items.length === 1}
                                                onClick={() => removeItem(index)}
                                                title="Quitar este artículo"
                                                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-30 sm:size-9 sm:w-9 dark:hover:bg-red-950/30"
                                            >
                                                <X className="size-4" aria-hidden="true" />
                                                <span className="sm:hidden">Quitar</span>
                                            </button>
                                        </div>
                                    </div>
                                </StaggerItem>
                            ))}

                            <button
                                type="button"
                                onClick={addItem}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)]"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Agregar artículo
                            </button>
                        </div>
                    </Panel>

                    <Panel title="Detalles internos">
                        <div className="space-y-4">
                            <Field id="estimated_cost" label="Costo de materiales (opcional)">
                                <CurrencyInput
                                    id="estimated_cost"
                                    className={INPUT_CLASS}
                                    value={values.estimated_cost}
                                    onChange={(v) => setValues((prev) => ({ ...prev, estimated_cost: v }))}
                                    placeholder="0"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lo que te costó hacer o comprar este pedido (opcional). Es solo para tu control interno — el cliente nunca lo ve.
                                </p>
                            </Field>

                            <Field id="notes" label="Notas (opcional)">
                                <textarea
                                    id="notes"
                                    placeholder="Ej: fecha de entrega acordada, instrucciones especiales del pedido..."
                                    value={values.notes}
                                    onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    maxLength={500}
                                    className="w-full resize-none rounded-lg border border-border/60 bg-white p-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm dark:bg-neutral-800"
                                />
                            </Field>
                        </div>
                    </Panel>
                </div>

                <aside aria-label="Resumen del pedido" className="flex flex-col gap-4 lg:sticky lg:top-4">
                    <div className="rounded-2xl border border-border/60 bg-card p-5">
                        <div className="text-right lg:text-left">
                            <p className="text-sm text-muted-foreground">Total del pedido</p>
                            <p className="text-3xl font-bold tracking-tight tabular-nums">
                                <RollingNumber value={total} format={formatCurrency} />
                            </p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                            <RollingNumber value={values.items.length} format={formatCount} className="font-medium text-foreground" />{' '}
                            {values.items.length === 1 ? 'línea' : 'líneas'} ·{' '}
                            <RollingNumber value={unitCount} format={formatCount} className="font-medium text-foreground" />{' '}
                            {unitCount === 1 ? 'unidad' : 'unidades'}
                        </p>
                    </div>

                    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 lg:hidden">
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="truncate text-lg leading-tight font-bold tabular-nums">{formatCurrency(total)}</p>
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ color: onBrand.hex }}
                            >
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </aside>
            </form>
        </>
    );
}
