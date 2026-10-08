import { usePage } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileBottomNav } from '../mobile-bottom-nav';

const sidebar = vi.hoisted(() => ({ setOpenMobile: vi.fn(), isMobile: true }));

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), visit: vi.fn() },
    Link: ({ href, children, prefetch, ...rest }: { href: string; children: ReactNode; prefetch?: boolean } & Record<string, unknown>) => (
        <a href={href} data-prefetch={prefetch ? 'true' : undefined} {...rest}>
            {children}
        </a>
    ),
    usePage: vi.fn(),
}));

vi.mock('@/components/ui/sidebar', () => ({
    useSidebar: () => ({ isMobile: sidebar.isMobile, setOpenMobile: sidebar.setOpenMobile }),
}));

const TENANT_ALL = [
    'pos.access',
    'dashboard.view',
    'sales.view',
    'clients.view',
    'credits.view',
    'products.create',
    'categories.view',
    'users.view',
    'reports.view',
    'finances.view',
    'expenses.view',
];

function mockPage(url: string, permissions: string[], role = 'administrador') {
    vi.mocked(usePage).mockReturnValue({
        url,
        props: { auth: { user: { role }, permissions }, business: { brand_color: '#C4686F', module_config: null } },
    } as unknown as ReturnType<typeof usePage>);
}

const bar = () => screen.getByRole('navigation', { name: 'Navegación principal' });
const labels = () =>
    within(bar())
        .getAllByRole('link')
        .concat(within(bar()).queryAllByRole('button'))
        .map((el) => el.textContent);

beforeEach(() => {
    vi.clearAllMocks();
    sidebar.isMobile = true;
    sessionStorage.clear();
});

afterEach(() => {
    sessionStorage.clear();
});

describe('MobileBottomNav', () => {
    it('shows the main destinations with POS in the middle and a More slot', () => {
        mockPage('/sales', TENANT_ALL);
        render(<MobileBottomNav />);

        const items = Array.from(bar().querySelectorAll('a, button')).map((el) => el.textContent);
        expect(items).toEqual(['Inicio', 'Ventas', 'POS', 'Catálogo', 'Más']);
    });

    it('marks the current page', () => {
        mockPage('/sales/12', TENANT_ALL);
        render(<MobileBottomNav />);

        expect(within(bar()).getByRole('link', { name: 'Ventas' })).toHaveAttribute('aria-current', 'page');
        expect(within(bar()).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    });

    it('opens the full menu from More', () => {
        mockPage('/sales', TENANT_ALL);
        render(<MobileBottomNav />);

        fireEvent.click(within(bar()).getByRole('button', { name: 'Más' }));

        expect(sidebar.setOpenMobile).toHaveBeenCalledWith(true);
    });

    it('only offers what the role can open', () => {
        mockPage('/dashboard', ['dashboard.view', 'sales.view', 'pos.access'], 'vendedor');
        render(<MobileBottomNav />);

        expect(labels()).toEqual(['Inicio', 'Ventas', 'POS']);
    });

    it('steps aside on the POS screen, which has its own checkout bar', () => {
        mockPage('/pos', TENANT_ALL);
        const { container } = render(<MobileBottomNav />);

        expect(container).toBeEmptyDOMElement();
    });

    it('is not rendered on large screens', () => {
        sidebar.isMobile = false;
        mockPage('/sales', TENANT_ALL);
        const { container } = render(<MobileBottomNav />);

        expect(container).toBeEmptyDOMElement();
    });

    it('is not rendered when fewer than two destinations are available', () => {
        mockPage('/dashboard', ['dashboard.view']);
        const { container } = render(<MobileBottomNav />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the platform destinations to a super admin without a More slot', () => {
        mockPage('/admin/tenants/3', [], 'super_admin');
        render(<MobileBottomNav />);

        expect(labels()).toEqual(['Negocios', 'Auditoría', 'Super Admins', 'Mi cuenta']);
        expect(within(bar()).getByRole('link', { name: 'Negocios' })).toHaveAttribute('aria-current', 'page');
    });

    it('remembers the active destination so the indicator can travel from it on the next page', () => {
        mockPage('/sales', TENANT_ALL);
        render(<MobileBottomNav />);

        expect(sessionStorage.getItem('stokity_bottom_nav_last')).toBe('/sales');
    });
});
