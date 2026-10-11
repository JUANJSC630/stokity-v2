/** Characterization tests for the business, printer and ticket template settings pages: pin today's behavior before the redesign. */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import BusinessSettings from '../business';
import PrinterSettings from '../printer';
import TicketSettings from '../ticket';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    setData: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    printer: {} as Record<string, unknown>,
    printBase64: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), visit: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { auth: { user: { id: 1 }, permissions: [] }, business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: env.processing,
                setData: (keyOrObject: string | Record<string, unknown>, value?: unknown) => {
                    if (typeof keyOrObject === 'string') {
                        setAll((previous) => ({ ...previous, [keyOrObject]: value }));
                    } else {
                        setAll(keyOrObject);
                    }
                },
                post: (url: string, options?: unknown) => env.post(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/layouts/settings/layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/lib/image-upload', () => ({ prepareImageForUpload: vi.fn(async (file: File) => file) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/use-printer', () => ({ usePrinter: () => env.printer }));
vi.mock('@/services/qzTray', () => ({ printBase64: (...args: unknown[]) => env.printBase64(...args) }));

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

const makePrinter = (overrides: Record<string, unknown> = {}) => ({
    status: 'idle',
    printers: [],
    selectedPrinter: '',
    paperWidth: 80,
    autoPrint: true,
    setSelectedPrinter: vi.fn(),
    setPaperWidth: vi.fn(),
    setAutoPrint: vi.fn(),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    printTest: vi.fn(async () => {}),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    env.errors = {};
    env.processing = false;
    env.printer = makePrinter();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const business = {
    name: 'Cueros y Perlas',
    logo: 'https://blob.test/logo.png',
    logo_url: 'https://blob.test/logo.png',
    default_product_image: null,
    default_product_image_url: null,
    nit: '900123456-7',
    phone: '3001112222',
    email: 'hola@cueros.co',
    address: 'Cra 7 # 32-15',
    social_media: '@cueros',
    currency_symbol: '$',
    brand_color: null,
    brand_color_secondary: null,
    require_cash_session: false,
};

describe('Business settings', () => {
    it('loads the business data', () => {
        render(<BusinessSettings business={business as never} />);

        expect(screen.getByLabelText('Nombre del negocio')).toHaveValue('Cueros y Perlas');
        expect(screen.getByLabelText('NIT / RUT')).toHaveValue('900123456-7');
        expect(screen.getByLabelText('Teléfono')).toHaveValue('3001112222');
        expect(screen.getByLabelText('Correo')).toHaveValue('hola@cueros.co');
        expect(screen.getByLabelText('Dirección')).toHaveValue('Cra 7 # 32-15');
        expect(screen.getByLabelText('Red social')).toHaveValue('@cueros');
        expect(screen.getByLabelText('Símbolo de moneda')).toHaveValue('$');
        expect(screen.getByAltText('Logo del negocio')).toHaveAttribute('src', 'https://blob.test/logo.png');
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('fills the empty optional fields with blanks and the currency with "$"', () => {
        render(
            <BusinessSettings
                business={
                    { ...business, nit: null, phone: null, email: null, address: null, social_media: null, currency_symbol: undefined } as never
                }
            />,
        );

        expect(screen.getByLabelText('NIT / RUT')).toHaveValue('');
        expect(screen.getByLabelText('Símbolo de moneda')).toHaveValue('$');
    });

    it('posts what was typed as form data, with the POST method', () => {
        render(<BusinessSettings business={business as never} />);

        fireEvent.change(screen.getByLabelText('Nombre del negocio'), { target: { value: 'Cueros SAS' } });
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post).toHaveBeenCalledWith(
            '/settings.business.update',
            { forceFormData: true, preserveScroll: true },
            expect.objectContaining({
                name: 'Cueros SAS',
                require_cash_session: true,
                logo: null,
                logo_url: 'https://blob.test/logo.png',
                _method: 'POST',
            }),
        );
    });

    it('picks a file as the logo, which clears the url', async () => {
        render(<BusinessSettings business={business as never} />);
        const file = new File(['x'], 'logo.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Cambiar logo'), { target: { files: [file] } });
        await waitFor(() => expect(screen.getByAltText('Logo del negocio').getAttribute('src')).toContain('data:'));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post.mock.calls[0][2]).toMatchObject({ logo: file, logo_url: '' });
    });

    it('uses a url as the logo, which clears the file, and previews it when it is http', () => {
        render(<BusinessSettings business={{ ...business, logo: null, logo_url: '/stokity-icon.png' } as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Usar URL/ }));
        fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://blob.test/nuevo.png' } });
        expect(screen.getByAltText('Logo del negocio')).toHaveAttribute('src', 'https://blob.test/nuevo.png');
        fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'ftp://x' } });
        expect(screen.getByAltText('Logo del negocio')).toHaveAttribute('src', 'https://blob.test/nuevo.png');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post.mock.calls[0][2]).toMatchObject({ logo: null, logo_url: 'ftp://x' });
    });

    it('ignores a stored logo that is not an http url as the default url value', () => {
        render(<BusinessSettings business={{ ...business, logo: 'logos/a.png' } as never} />);

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post.mock.calls[0][2]).toMatchObject({ logo_url: '' });
    });

    it('shows the errors and the saving label', () => {
        env.errors = { name: 'Nombre requerido', logo: 'Logo inválido', logo_url: 'URL inválida', currency_symbol: 'Símbolo inválido' };
        env.processing = true;
        render(<BusinessSettings business={business as never} />);
        fireEvent.click(screen.getByRole('button', { name: /Usar URL/ }));

        for (const message of ['Nombre requerido', 'Logo inválido', 'URL inválida', 'Símbolo inválido']) {
            expect(screen.getByText(message)).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    });
});

describe('Printer settings', () => {
    it('says QZ Tray is inactive and offers to connect', async () => {
        const printer = env.printer as ReturnType<typeof makePrinter>;
        render(<PrinterSettings />);

        expect(screen.getByText('QZ Tray inactivo')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Conectar/ }));
        expect(printer.connect).toHaveBeenCalled();
    });

    it.each([
        ['connecting', 'Buscando QZ Tray…'],
        ['unavailable', 'QZ Tray no encontrado'],
        ['connected', 'QZ Tray activo'],
    ])('shows the %s state', (status, label) => {
        env.printer = makePrinter({ status });
        render(<PrinterSettings />);

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('explains how to install it when it is unavailable, and still offers to connect', () => {
        env.printer = makePrinter({ status: 'unavailable' });
        render(<PrinterSettings />);

        expect(screen.getByText(/QZ Tray no está ejecutándose en este equipo/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Conectar/ })).toBeInTheDocument();
    });

    it('does not offer to connect while connecting', () => {
        env.printer = makePrinter({ status: 'connecting' });
        render(<PrinterSettings />);

        expect(screen.queryByRole('button', { name: /Conectar/ })).not.toBeInTheDocument();
    });

    it('disconnects and says so', async () => {
        const printer = makePrinter({ status: 'connected', printers: ['Epson'], selectedPrinter: 'Epson' });
        env.printer = printer;
        render(<PrinterSettings />);

        fireEvent.click(screen.getByRole('button', { name: /Desconectar/ }));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Desconectado de QZ Tray.'));
        expect(printer.disconnect).toHaveBeenCalled();
    });

    it('toggles auto-print and says what it did', () => {
        const printer = makePrinter({ autoPrint: true });
        env.printer = printer;
        const { unmount } = render(<PrinterSettings />);

        fireEvent.click(screen.getByRole('switch'));
        expect(printer.setAutoPrint).toHaveBeenCalledWith(false);
        expect(toast.success).toHaveBeenCalledWith('Impresión automática desactivada.');
        unmount();

        const off = makePrinter({ autoPrint: false });
        env.printer = off;
        render(<PrinterSettings />);
        fireEvent.click(screen.getByRole('switch'));
        expect(off.setAutoPrint).toHaveBeenCalledWith(true);
        expect(toast.success).toHaveBeenLastCalledWith('Impresión automática activada.');
    });

    it('lets the user pick the printer and the paper when connected', () => {
        const printer = makePrinter({ status: 'connected', printers: ['Epson', 'Star'], selectedPrinter: 'Epson', paperWidth: 58 });
        env.printer = printer;
        render(<PrinterSettings />);

        expect(screen.getByText('58 mm', { selector: 'span' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Star' }));
        fireEvent.click(screen.getByRole('button', { name: '80 mm' }));

        expect(printer.setSelectedPrinter).toHaveBeenCalledWith('Star');
        expect(printer.setPaperWidth).toHaveBeenCalledWith(80);
    });

    it('prints a test page only with a printer selected, and reports the result', async () => {
        const printer = makePrinter({ status: 'connected', printers: ['Epson'], selectedPrinter: '' });
        env.printer = printer;
        const { unmount } = render(<PrinterSettings />);
        expect(screen.getByRole('button', { name: /Probar impresora/ })).toBeDisabled();
        unmount();

        const ready = makePrinter({ status: 'connected', printers: ['Epson'], selectedPrinter: 'Epson' });
        env.printer = ready;
        render(<PrinterSettings />);
        fireEvent.click(screen.getByRole('button', { name: /Probar impresora/ }));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Trabajo enviado al spooler')));
        expect(ready.printTest).toHaveBeenCalled();
    });

    it('reports a failing test page', async () => {
        const printer = makePrinter({
            status: 'connected',
            printers: ['Epson'],
            selectedPrinter: 'Epson',
            printTest: vi.fn(async () => Promise.reject(new Error('sin papel'))),
        });
        env.printer = printer;
        render(<PrinterSettings />);

        fireEvent.click(screen.getByRole('button', { name: /Probar impresora/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error: sin papel'));
    });

    it('offers the certificate and the five-step guide, marking steps 1 and 5 done when everything works', () => {
        env.printer = makePrinter({ status: 'connected', printers: ['Epson'], selectedPrinter: 'Epson' });
        render(<PrinterSettings />);

        expect(screen.getByRole('link', { name: /Descargar certificado/ })).toHaveAttribute('href', '/qz/certificate/download');
        const steps = screen.getAllByRole('listitem');
        expect(steps.length).toBe(5);
        expect(within(steps[0]).getByText('Descargar e instalar QZ Tray').className).toContain('line-through');
        expect(within(steps[4]).getByText('¡Listo! Conecta y selecciona tu impresora').className).toContain('line-through');
        expect(within(steps[1]).getByText('Descargar el certificado de Stokity').className).not.toContain('line-through');
    });
});

describe('Ticket template settings', () => {
    const config = {
        paper_width: 80,
        header_size: 'normal',
        show_logo: true,
        show_nit: true,
        show_address: true,
        show_phone: true,
        show_social_media: true,
        show_seller: true,
        show_branch: false,
        show_tax: true,
        footer_line1: '¡Gracias por su compra!',
        footer_line2: 'Vuelva pronto',
        sale_code_graphic: 'none',
        return_show_seller: true,
        return_show_branch: true,
        return_show_reason: true,
        return_footer_line1: 'Devolución procesada.',
        return_footer_line2: 'Gracias por su preferencia.',
        return_code_graphic: 'qr',
    };
    const info = {
        name: 'Cueros y Perlas',
        nit: '900123456-7',
        address: 'Cra 7 # 32-15',
        phone: '3001112222',
        social_media: '@cueros',
        currency_symbol: '$',
        logo_url: null,
    };
    const renderTicket = (overrides: Record<string, unknown> = {}, businessOverrides: Record<string, unknown> = {}) =>
        render(<TicketSettings config={{ ...config, ...overrides } as never} business={{ ...info, ...businessOverrides } as never} />);
    const openReturnTab = () => fireEvent.mouseDown(screen.getByRole('tab', { name: 'Ticket de devolución' }));

    it('previews the sale ticket with the business data and sample products', () => {
        renderTicket();

        const preview = document.body;
        expect(within(preview).getByText('Cueros y Perlas')).toBeInTheDocument();
        expect(within(preview).getByText('NIT: 900123456-7')).toBeInTheDocument();
        expect(within(preview).getByText('Chocolate Bon Bon')).toBeInTheDocument();
        expect(within(preview).getByText('Vendedor:')).toBeInTheDocument();
        expect(within(preview).queryByText('Sucursal:')).not.toBeInTheDocument();
        expect(within(preview).getByText('Síguenos en:')).toBeInTheDocument();
        expect(within(preview).getByText('¡Gracias por su compra!')).toBeInTheDocument();
    });

    it('shows placeholders for business data that is not configured', () => {
        renderTicket({}, { nit: null, address: null, phone: null });

        expect(screen.getByText('NIT: (no configurado)')).toBeInTheDocument();
        expect(screen.getByText('(dirección no configurada)')).toBeInTheDocument();
        expect(screen.getByText('Tel: (no configurado)')).toBeInTheDocument();
    });

    it('updates the preview as the options change', () => {
        renderTicket();

        fireEvent.click(screen.getByLabelText('Mostrar sucursal'));
        expect(screen.getByText('Sucursal:')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Mostrar impuesto'));
        expect(screen.queryByText('Impuesto:')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Código QR' }));
        expect(screen.getByText('QR · código de venta')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '58 mm' }));
        fireEvent.click(screen.getByRole('button', { name: 'Título grande (2×)' }));
        fireEvent.change(screen.getByPlaceholderText('¡Gracias por su compra!'), { target: { value: 'Hasta pronto' } });
        expect(screen.getByText('Hasta pronto')).toBeInTheDocument();
    });

    it('disables the social network switch when the business has none', () => {
        renderTicket({}, { social_media: null });

        expect(screen.getByLabelText(/Mostrar red social/)).toBeDisabled();
        expect(screen.getByText('(no configurada)')).toBeInTheDocument();
    });

    it('switches to the return ticket and previews it', () => {
        renderTicket();

        openReturnTab();

        expect(screen.getByText('RECIBO DE DEVOLUCIÓN')).toBeInTheDocument();
        expect(screen.getByText('Motivo:')).toBeInTheDocument();
        expect(screen.getByText('QR · código de venta')).toBeInTheDocument();
    });

    it('saves the whole template and says so', () => {
        env.post.mockImplementation((_url, options) => (options as { onSuccess: () => void }).onSuccess());
        renderTicket();

        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(env.post).toHaveBeenCalledWith(
            '/settings.ticket.update',
            expect.any(Object),
            expect.objectContaining({ paper_width: 80, footer_line2: 'Vuelva pronto' }),
        );
        expect(toast.success).toHaveBeenCalledWith('Plantilla guardada.');
    });

    it('says when saving fails', () => {
        env.post.mockImplementation((_url, options) => (options as { onError: () => void }).onError());
        renderTicket();

        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(toast.error).toHaveBeenCalledWith('Error al guardar.');
    });

    it('cannot print a test without QZ Tray, and points to the printer settings', () => {
        renderTicket();

        expect(screen.getByRole('button', { name: /Prueba/ })).toBeDisabled();
        expect(screen.getByText('Configuración → Impresora').closest('a')).toHaveAttribute('href', '/settings/printer');
    });

    it('sends the unsaved template to the server and prints what comes back', async () => {
        env.printer = makePrinter({ status: 'connected', selectedPrinter: 'Epson' });
        document.cookie = 'XSRF-TOKEN=abc%3D123';
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: 'QkFTRTY0' }) }));
        vi.stubGlobal('fetch', fetchMock);
        renderTicket();
        openReturnTab();

        fireEvent.click(screen.getByRole('button', { name: /Prueba/ }));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recibo de prueba enviado a la impresora.'));
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
        expect(url).toBe('/print/test-template');
        expect(init.method).toBe('POST');
        expect(init.headers['X-XSRF-TOKEN']).toBe('abc=123');
        expect(JSON.parse(init.body)).toMatchObject({ paper_width: 80, template_type: 'return' });
        expect(env.printBase64).toHaveBeenCalledWith('Epson', 'QkFTRTY0');
    });

    it('reports a failing test print', async () => {
        env.printer = makePrinter({ status: 'connected', selectedPrinter: 'Epson' });
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, json: async () => ({}) })),
        );
        renderTicket();

        fireEvent.click(screen.getByRole('button', { name: /Prueba/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error: Error al generar recibo de prueba'));
    });

    it('asks to select a printer first when connected without one', async () => {
        env.printer = makePrinter({ status: 'connected', selectedPrinter: '' });
        renderTicket();

        fireEvent.click(screen.getByRole('button', { name: /Prueba/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Conecta QZ Tray y selecciona una impresora en Configuración → Impresora.'));
    });
});
