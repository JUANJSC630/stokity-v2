import { INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { AlertTriangle, Recycle } from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

interface NameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    submitLabel: string;
    /** Keeps the field ids of two dialogs apart. */
    idPrefix: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    processing: boolean;
    onSubmit: (event: FormEvent) => void;
}

/** Create or rename a category: one field, 44 px controls, the main action on the brand color. */
export function CategoryNameDialog({
    open,
    onOpenChange,
    title,
    description,
    submitLabel,
    idPrefix,
    value,
    onChange,
    error,
    processing,
    onSubmit,
}: NameDialogProps) {
    const onBrand = useOnBrandColor();
    const id = `${idPrefix}name`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <LabeledField id={id} label="Nombre" error={error}>
                        <input
                            id={id}
                            placeholder="Nombre de la categoría"
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            className={INPUT_CLASS}
                            autoFocus
                            required
                        />
                    </LabeledField>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            {submitLabel}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    tone: 'danger' | 'restore';
    children: ReactNode;
    cancelLabel: string;
    /** Left out when the action is not allowed (the dialog then only explains why). */
    confirmLabel?: string;
    onConfirm?: () => void;
}

/** A yes/no question about one category, with the consequence in plain words. */
export function CategoryConfirmDialog({ open, onOpenChange, title, tone, children, cancelLabel, confirmLabel, onConfirm }: ConfirmDialogProps) {
    const Icon = tone === 'danger' ? AlertTriangle : Recycle;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className={cn('size-5', tone === 'danger' ? 'text-red-500' : 'text-[var(--brand-primary)]')} aria-hidden="true" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription asChild>
                    <div className="text-sm text-muted-foreground">{children}</div>
                </DialogDescription>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => onOpenChange(false)}>
                        {cancelLabel}
                    </Button>
                    {confirmLabel && onConfirm && (
                        <Button type="button" variant={tone === 'danger' ? 'destructive' : 'default'} className="h-11 sm:h-10" onClick={onConfirm}>
                            {confirmLabel}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
