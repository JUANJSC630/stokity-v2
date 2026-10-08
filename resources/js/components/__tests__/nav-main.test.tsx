import { SidebarProvider } from '@/components/ui/sidebar';
import { type NavGroup } from '@/types';
import { usePage } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavMain } from '../nav-main';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), visit: vi.fn() },
    Link: ({ href, children, prefetch, ...rest }: { href: string; children: ReactNode; prefetch?: boolean } & Record<string, unknown>) => (
        <a href={href} data-prefetch={prefetch ? 'true' : undefined} {...rest}>
            {children}
        </a>
    ),
    usePage: vi.fn(),
}));

const groups: NavGroup[] = [
    {
        items: [
            { title: 'POS', href: '/pos', permission: 'pos.access', highlight: true },
            { title: 'Inicio', href: '/dashboard', permission: 'dashboard.view' },
        ],
    },
    {
        label: 'Vender',
        items: [
            { title: 'Ventas', href: '/sales', permission: 'sales.view' },
            { title: 'Créditos', href: '/credits', permission: 'credits.view', module: 'credits' },
        ],
    },
    {
        label: 'Dinero',
        items: [
            {
                title: 'Reportes',
                href: '',
                permission: 'reports.view',
                children: [
                    { title: 'Principal', href: '/reports' },
                    { title: 'Productos', href: '/reports/products' },
                ],
            },
        ],
    },
];

function mockPage(url: string, permissions: string[], moduleConfig: Record<string, boolean> | null = null) {
    vi.mocked(usePage).mockReturnValue({
        url,
        props: { auth: { user: { role: 'administrador' }, permissions }, business: { brand_color: '#C4686F', module_config: moduleConfig } },
    } as unknown as ReturnType<typeof usePage>);
}

function renderNav() {
    return render(
        <SidebarProvider>
            <NavMain groups={groups} />
        </SidebarProvider>,
    );
}

const ALL = ['pos.access', 'dashboard.view', 'sales.view', 'credits.view', 'reports.view'];

beforeAll(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: false,
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
});

describe('NavMain', () => {
    it('renders the groups with their labels', () => {
        mockPage('/dashboard', ALL);
        renderNav();

        expect(screen.getByText('Vender')).toBeInTheDocument();
        expect(screen.getByText('Dinero')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ventas' })).toHaveAttribute('href', '/sales');
    });

    it('shows the highlighted item as the primary action', () => {
        mockPage('/dashboard', ALL);
        renderNav();

        expect(screen.getByRole('link', { name: /Abrir POS/ })).toHaveAttribute('href', '/pos');
    });

    it('hides groups and items the user has no permission for', () => {
        mockPage('/dashboard', ['dashboard.view']);
        renderNav();

        expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
        expect(screen.queryByText('Vender')).not.toBeInTheDocument();
        expect(screen.queryByText('Dinero')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Abrir POS/ })).not.toBeInTheDocument();
    });

    it('hides an item whose module is disabled', () => {
        mockPage('/dashboard', ALL, { credits: false });
        renderNav();

        expect(screen.queryByRole('link', { name: 'Créditos' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ventas' })).toBeInTheDocument();
    });

    it('marks only the current page as active', () => {
        mockPage('/sales/12?page=2', ALL);
        renderNav();

        expect(screen.getByRole('link', { name: 'Ventas' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    });

    it('marks the most specific child active and opens its accordion', () => {
        mockPage('/reports/products', ALL);
        renderNav();

        const group = screen.getByRole('button', { name: 'Reportes' });
        expect(group).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Principal' })).not.toHaveAttribute('aria-current');
    });

    it('keeps an unrelated accordion closed and toggles it on click', () => {
        mockPage('/sales', ALL);
        renderNav();

        const group = screen.getByRole('button', { name: 'Reportes' });
        expect(group).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(group);
        expect(group).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(group);
        expect(group).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not mark an accordion child active on another page', () => {
        mockPage('/sales', ALL);
        const { container } = renderNav();

        const menu = within(container).getByRole('link', { name: 'Ventas' });
        expect(menu).toHaveAttribute('aria-current', 'page');
        expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    });
});
