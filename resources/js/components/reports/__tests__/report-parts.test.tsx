import { downloadFile } from '@/lib/download';
import { router } from '@inertiajs/react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportEmpty, ReportFilterPanel, ReportHeader, ReportKpi, ReportTable } from '../report-parts';
import { useReportFilters } from '../use-report-filters';

const env = vi.hoisted(() => ({ wide: true }));

vi.mock('@inertiajs/react', () => ({ router: { get: vi.fn() } }));
vi.mock('@/lib/download', () => ({ downloadFile: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/use-on-brand-color', () => ({ useOnBrandColor: () => ({ hex: '#ffffff' }) }));
vi.mock('@/components/ui/select', () => ({
    Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeAll(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: env.wide,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
});

beforeEach(() => {
    vi.clearAllMocks();
    env.wide = true;
    vi.mocked(downloadFile).mockResolvedValue(undefined);
});

describe('ReportHeader', () => {
    it('shows the title and sends the chosen export type', () => {
        const onExport = vi.fn();
        render(<ReportHeader title="Reporte X" subtitle="Algo" onExport={onExport} />);

        expect(screen.getByRole('heading', { name: 'Reporte X' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
        fireEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }));
        expect(onExport.mock.calls).toEqual([['excel'], ['pdf']]);
    });
});

describe('ReportFilterPanel', () => {
    it('is always open on a wide screen and applies the filters', () => {
        const onApply = vi.fn();
        render(
            <ReportFilterPanel onApply={onApply}>
                <input aria-label="campo" />
            </ReportFilterPanel>,
        );

        expect(screen.getByLabelText('campo')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));
        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('folds the fields on a phone, counts the active ones and opens on tap', () => {
        env.wide = false;
        render(
            <ReportFilterPanel onApply={vi.fn()} activeCount={2}>
                <input aria-label="campo" />
            </ReportFilterPanel>,
        );

        expect(screen.queryByLabelText('campo')).toBeNull();
        expect(screen.getByText('2 activos')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
        expect(screen.getByLabelText('campo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Aplicar Filtros/ })).toBeInTheDocument();
    });
});

describe('ReportTable', () => {
    const rows = [{ id: 1, name: 'Collar', code: 'C-1', amount: '$ 10', qty: 3 }];
    const columns = [
        { key: 'code', header: 'Código', cell: (r: (typeof rows)[number]) => r.code, mobile: 'subtitle' as const },
        { key: 'name', header: 'Producto', cell: (r: (typeof rows)[number]) => r.name, mobile: 'title' as const },
        { key: 'qty', header: 'Cantidad', cell: (r: (typeof rows)[number]) => r.qty, mobile: 'detail' as const },
        { key: 'amount', header: 'Monto', cell: (r: (typeof rows)[number]) => r.amount, mobile: 'value' as const },
        { key: 'hidden', header: 'Oculto', cell: () => 'secreto', mobile: 'hide' as const },
    ];

    it('is a captioned table with every column on a wide screen', () => {
        render(<ReportTable caption="Productos" rows={rows} columns={columns} rowKey={(r) => r.id} />);

        expect(screen.getByRole('table', { name: 'Productos' })).toBeInTheDocument();
        expect(screen.getByText('Oculto')).toBeInTheDocument();
        expect(screen.getByText('secreto')).toBeInTheDocument();
    });

    it('turns into one card per row on a phone and leaves out the hidden columns', () => {
        env.wide = false;
        render(<ReportTable caption="Productos" rows={rows} columns={columns} rowKey={(r) => r.id} />);

        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getByRole('list', { name: 'Productos' })).toBeInTheDocument();
        expect(screen.getByText('Collar')).toBeInTheDocument();
        expect(screen.getByText('$ 10')).toBeInTheDocument();
        expect(screen.queryByText('secreto')).toBeNull();
    });

    it('says nothing when there are no rows, so the page can show its own empty text', () => {
        render(
            <>
                <ReportTable caption="Vacío" rows={[]} columns={columns} rowKey={(r: (typeof rows)[number]) => r.id} />
                <ReportEmpty>Sin datos.</ReportEmpty>
            </>,
        );

        expect(screen.getByText('Sin datos.')).toBeInTheDocument();
    });
});

describe('ReportKpi', () => {
    it('shows its label, figure and hint', () => {
        render(
            <ReportKpi label="Total" hint="Ventas">
                42
            </ReportKpi>,
        );

        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Ventas')).toBeInTheDocument();
    });
});

describe('useReportFilters', () => {
    const setup = (user?: { is_admin: boolean; branch_id?: number }) =>
        renderHook(() =>
            useReportFilters({
                path: '/reports/x',
                exportBase: '/reports/x/export',
                filters: { date_from: '2026-10-01', date_to: '2026-10-10', branch_id: 'all' },
                user,
            }),
        );

    it('sends the filters without the "all" choices', () => {
        const { result } = setup({ is_admin: true });

        act(() => result.current.applyFilters());

        expect(router.get).toHaveBeenCalledWith(
            '/reports/x',
            { date_from: '2026-10-01', date_to: '2026-10-10' },
            { preserveState: true, preserveScroll: true },
        );
    });

    it('forces the branch of a non-admin user', () => {
        const { result } = setup({ is_admin: false, branch_id: 7 });

        act(() => result.current.applyFilters());

        expect(vi.mocked(router.get).mock.calls[0][1]).toMatchObject({ branch_id: '7' });
    });

    it('builds the export url from the same filters', async () => {
        const { result } = setup({ is_admin: false, branch_id: 7 });

        await act(async () => {
            await result.current.exportReport('pdf');
        });

        const url = new URL(vi.mocked(downloadFile).mock.calls[0][0] as string);
        expect(url.pathname).toBe('/reports/x/export/pdf');
        expect(url.searchParams.get('branch_id')).toBe('7');
        expect(url.searchParams.get('date_from')).toBe('2026-10-01');
    });

    it('counts the filters that are set', () => {
        const { result } = setup({ is_admin: true });

        expect(result.current.activeCount).toBe(3);
        act(() => result.current.setFilter('category_id', '4'));
        expect(result.current.activeCount).toBe(4);
    });
});
