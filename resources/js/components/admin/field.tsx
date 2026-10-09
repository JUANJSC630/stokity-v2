import { INPUT } from '@/components/admin/styles';
import { type ComponentProps } from 'react';

interface FieldProps extends Omit<ComponentProps<'input'>, 'id' | 'className'> {
    id: string;
    label: string;
    error?: string;
}

/** Labelled 44 px / 16 px input with its validation message, shared by the admin forms. */
export function Field({ id, label, error, ...input }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-medium">
                {label}
            </label>
            <input
                id={id}
                className={INPUT}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                {...input}
            />
            {error && (
                <p id={`${id}-error`} className="text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}
