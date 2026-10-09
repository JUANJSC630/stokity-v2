import { FormPanel, INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface ClientFormData {
    name: string;
    document: string;
    phone: string;
    address: string;
    email: string;
    birthdate: string;
    is_wholesale: boolean;
    wholesale_discount_pct: string;
}

interface ClientFormFieldsProps {
    data: ClientFormData;
    errors: Partial<Record<keyof ClientFormData, string>>;
    setData: <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => void;
    /** The wholesale-order dialog asks by city, not by email. */
    simplified?: boolean;
    canManageWholesale?: boolean;
}

/** The fields shared by the create page, the edit page and the "new client" dialogs. */
export function ClientFormFields({ data, errors, setData, simplified = false, canManageWholesale = false }: ClientFormFieldsProps) {
    return (
        <>
            <FormPanel title="Datos del cliente">
                <LabeledField id="name" label="Nombre" required error={errors.name}>
                    <input
                        id="name"
                        type="text"
                        autoComplete="off"
                        className={INPUT_CLASS}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        aria-invalid={errors.name ? true : undefined}
                        required
                    />
                </LabeledField>
                <LabeledField id="document" label="Documento" required error={errors.document}>
                    <input
                        id="document"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        className={INPUT_CLASS}
                        value={data.document}
                        onChange={(e) => setData('document', e.target.value)}
                        placeholder="Cédula de ciudadanía"
                        aria-invalid={errors.document ? true : undefined}
                        required
                    />
                </LabeledField>
                <LabeledField id="phone" label="Teléfono" error={errors.phone}>
                    <input
                        id="phone"
                        type="tel"
                        autoComplete="off"
                        className={INPUT_CLASS}
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                    />
                </LabeledField>
                {!simplified && (
                    <LabeledField id="email" label="Correo electrónico" error={errors.email}>
                        <input
                            id="email"
                            type="email"
                            autoComplete="off"
                            className={INPUT_CLASS}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </LabeledField>
                )}
                <LabeledField id="address" label={simplified ? 'Ciudad' : 'Dirección'} error={errors.address}>
                    <input
                        id="address"
                        type="text"
                        autoComplete="off"
                        className={cn(INPUT_CLASS, 'truncate')}
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                    />
                </LabeledField>
                <LabeledField id="birthdate" label="Fecha de nacimiento" error={errors.birthdate}>
                    <input
                        id="birthdate"
                        type="date"
                        className={INPUT_CLASS}
                        value={data.birthdate ? data.birthdate.slice(0, 10) : ''}
                        onChange={(e) => setData('birthdate', e.target.value)}
                    />
                </LabeledField>
            </FormPanel>

            {canManageWholesale && (
                <section className="rounded-2xl border border-border/60 bg-card">
                    <div className="flex items-center justify-between gap-4 p-5">
                        <div className="min-w-0">
                            <label htmlFor="is_wholesale" className="text-sm font-medium">
                                Cliente mayorista
                            </label>
                            <p className="text-xs text-muted-foreground">Aplica su descuento automáticamente en el POS al seleccionarlo.</p>
                        </div>
                        <Switch
                            id="is_wholesale"
                            checked={data.is_wholesale}
                            onCheckedChange={(checked) => {
                                setData('is_wholesale', checked);
                                if (!checked) setData('wholesale_discount_pct', '');
                            }}
                        />
                    </div>
                    {data.is_wholesale && (
                        <div className="border-t border-border/60 px-5 pt-4 pb-5">
                            <LabeledField
                                id="wholesale_discount_pct"
                                label="Descuento (%)"
                                required
                                error={errors.wholesale_discount_pct}
                                className="max-w-40"
                            >
                                <input
                                    id="wholesale_discount_pct"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    className={INPUT_CLASS}
                                    value={data.wholesale_discount_pct}
                                    onChange={(e) => setData('wholesale_discount_pct', e.target.value)}
                                />
                            </LabeledField>
                        </div>
                    )}
                </section>
            )}
        </>
    );
}
