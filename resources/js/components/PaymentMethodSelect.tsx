import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

interface PaymentMethodSelectProps {
    value: string | undefined;
    onValueChange: (value: string) => void;
    error?: string;
    required?: boolean;
    label?: string;
    placeholder?: string;
}

export default function PaymentMethodSelect({
    value,
    onValueChange,
    error,
    required = false,
    label = 'Método de Pago',
    placeholder = 'Seleccione método de pago',
}: PaymentMethodSelectProps) {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const response = await fetch('/api/payment-methods/active');
                if (response.ok) {
                    const data = await response.json();
                    setPaymentMethods(data);
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
    }, []);

    if (loading) {
        return (
            <div className="space-y-2">
                <Label htmlFor="payment_method">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <Select disabled>
                    <SelectTrigger id="payment_method" className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
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
    const safeValue = value && paymentMethods.some((method) => method.code === value) ? value : undefined;

    return (
        <div className="space-y-2">
            <Label htmlFor="payment_method">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Select value={safeValue} onValueChange={onValueChange}>
                <SelectTrigger id="payment_method" className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
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
