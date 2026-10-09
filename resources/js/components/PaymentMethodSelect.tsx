import { paymentMethodLabel } from '@/components/sales/sale-status';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

/** Codes the app has used for the same method over time; the active list decides which one is current. */
const EQUIVALENT_CODES: Record<string, string> = {
    transfer: 'bank_transfer',
    bank_transfer: 'transfer',
};

interface PaymentMethodSelectProps {
    value: string | undefined;
    onValueChange: (value: string) => void;
    error?: string;
    required?: boolean;
    label?: string;
    placeholder?: string;
    /** Extra classes for the trigger, e.g. a taller touch target. */
    triggerClassName?: string;
}

export default function PaymentMethodSelect({
    value,
    onValueChange,
    error,
    required = false,
    label = 'Método de Pago',
    placeholder = 'Seleccione método de pago',
    triggerClassName,
}: PaymentMethodSelectProps) {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const response = await fetch('/api/payment-methods/active');
                if (response.ok) {
                    const data: PaymentMethod[] = await response.json();
                    setPaymentMethods(data);

                    // Auto-select default when no value is set:
                    // prefer 'cash', otherwise the first available method.
                    if (!value && data.length > 0) {
                        const defaultMethod = data.find((m) => m.code === 'cash') ?? data[0];
                        onValueChange(defaultMethod.code);
                    } else if (value && !data.some((m) => m.code === value)) {
                        // The saved method is no longer in the active list: use its current equivalent when there is one.
                        const equivalent = data.find((m) => m.code === EQUIVALENT_CODES[value]);
                        if (equivalent) onValueChange(equivalent.code);
                    }
                } else {
                    console.error('Error fetching payment methods:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching payment methods:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPaymentMethods();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="space-y-2">
                {label && (
                    <Label htmlFor="payment_method">
                        {label} {required && <span className="text-red-500">*</span>}
                    </Label>
                )}
                <Select disabled>
                    <SelectTrigger
                        id="payment_method"
                        className={cn('w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100', triggerClassName)}
                    >
                        <SelectValue placeholder="Cargando métodos de pago..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="loading">Cargando...</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        );
    }

    // Asegurar que el valor nunca sea una cadena vacía y que esté en la lista de métodos disponibles
    const isListed = Boolean(value) && paymentMethods.some((method) => method.code === value);
    // A saved method that is not active any more stays visible (instead of an empty select) so the sale reads as it was recorded.
    const retiredValue = value && !isListed && value !== 'no-methods' ? value : undefined;
    const safeValue = isListed ? value : retiredValue;

    return (
        <div className="space-y-2">
            {label && (
                <Label htmlFor="payment_method">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
            )}
            <Select value={safeValue} onValueChange={onValueChange}>
                <SelectTrigger
                    id="payment_method"
                    className={cn('w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100', triggerClassName)}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {retiredValue && (
                        <SelectItem value={retiredValue} disabled>
                            {paymentMethodLabel(retiredValue)} (ya no disponible)
                        </SelectItem>
                    )}
                    {paymentMethods.length > 0 ? (
                        paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.code}>
                                {method.name}
                            </SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no-methods" disabled>
                            No hay métodos de pago disponibles
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
