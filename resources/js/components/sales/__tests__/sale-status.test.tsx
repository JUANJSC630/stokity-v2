import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { paymentMethodLabel, SaleStatusPill, saleStatusStyle } from '../sale-status';

describe('sale status', () => {
    it.each([
        ['completed', 'Completada'],
        ['pending', 'Pendiente'],
        ['cancelled', 'Cancelada'],
        ['credit_pending', 'Crédito pendiente'],
    ])('labels %s as %s', (status, label) => {
        render(<SaleStatusPill status={status} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('keeps an unknown status readable instead of hiding it', () => {
        render(<SaleStatusPill status="archivada" />);
        expect(screen.getByText('archivada')).toBeInTheDocument();
        expect(saleStatusStyle('archivada').pill).toContain('bg-muted');
    });

    it.each([
        ['cash', 'Efectivo'],
        ['transfer', 'Transferencia'],
        ['credit_card', 'Tarjeta de crédito'],
        ['debit_card', 'Tarjeta débito'],
        ['other', 'Otro'],
        ['credito', 'Crédito'],
        ['bank_transfer', 'Transferencia'],
        ['nequi', 'nequi'],
    ])('names payment method %s as %s', (method, label) => {
        expect(paymentMethodLabel(method)).toBe(label);
    });
});
