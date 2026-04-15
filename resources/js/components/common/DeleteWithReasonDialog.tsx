import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface DeleteWithReasonDialogProps {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    processing?: boolean;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}

export function DeleteWithReasonDialog({
    open,
    title,
    description,
    confirmLabel = 'Eliminar',
    processing = false,
    onConfirm,
    onClose,
}: DeleteWithReasonDialogProps) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        onConfirm(reason);
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription asChild>
                        <div>{description}</div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="deletion_reason" className="text-sm">
                        Motivo <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <textarea
                        id="deletion_reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="¿Por qué se elimina?"
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={processing}>
                        {processing ? 'Eliminando...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
