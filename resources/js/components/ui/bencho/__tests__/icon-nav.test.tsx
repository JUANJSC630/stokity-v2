import { act, fireEvent, render, screen } from '@testing-library/react';
import { Home, Search, User, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconNav, type IconNavItem } from '../icon-nav';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, prefetch, ...rest }: { href: string; children: ReactNode; prefetch?: boolean } & Record<string, unknown>) => (
        <a href={href} data-prefetch={prefetch ? 'true' : undefined} {...rest} onClick={(event) => { event.preventDefault(); (rest.onClick as (() => void) | undefined)?.(); }}>
            {children}
        </a>
    ),
}));

const GEOMETRY: Record<string, { left: number; width: number }> = {
    Inicio: { left: 0, width: 100 },
    Buscar: { left: 100, width: 100 },
    Perfil: { left: 200, width: 100 },
};

const items = (extra: Partial<IconNavItem> = {}): IconNavItem[] => [
    { key: 'home', label: 'Inicio', icon: Home as LucideIcon, href: '/home' },
    { key: 'search', label: 'Buscar', icon: Search as LucideIcon, href: '/search' },
    { key: 'me', label: 'Perfil', icon: User as LucideIcon, href: '/me', ...extra },
];

const indicator = (container: HTMLElement) => container.querySelector('span[data-phase]') as HTMLElement;

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { configurable: true, get: function (this: HTMLElement) { return GEOMETRY[this.textContent ?? '']?.left ?? 0; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: function (this: HTMLElement) { return GEOMETRY[this.textContent ?? '']?.width ?? 0; } });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    sessionStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
});

describe('IconNav', () => {
    it('places the indicator under the active item', () => {
        const { container } = render(<IconNav items={items()} activeKey="search" label="Principal" />);

        expect(indicator(container).style.transform).toBe('translate3d(100px, 0, 0)');
        expect(indicator(container).style.width).toBe('100px');
        expect(indicator(container).dataset.phase).toBe('idle');
        expect(screen.getByRole('link', { name: 'Buscar' })).toHaveAttribute('aria-current', 'page');
    });

    it('stretches across the distance and then settles on the tapped item', () => {
        const { container } = render(<IconNav items={items()} activeKey="home" label="Principal" />);

        fireEvent.click(screen.getByRole('link', { name: 'Perfil' }));

        expect(indicator(container).dataset.phase).toBe('stretch');
        expect(indicator(container).style.transform).toBe('translate3d(0px, 0, 0)');
        expect(indicator(container).style.width).toBe('300px');

        act(() => {
            vi.advanceTimersByTime(160);
        });

        expect(indicator(container).dataset.phase).toBe('settle');
        expect(indicator(container).style.transform).toBe('translate3d(200px, 0, 0)');
        expect(indicator(container).style.width).toBe('100px');
    });

    it('starts where the previous page left the indicator and travels to the current item', () => {
        sessionStorage.setItem('bar', 'home');
        const { container } = render(<IconNav items={items()} activeKey="me" label="Principal" memoryKey="bar" />);

        expect(indicator(container).style.transform).toBe('translate3d(0px, 0, 0)');
        expect(indicator(container).dataset.phase).toBe('idle');

        act(() => {
            vi.advanceTimersByTime(40);
        });
        expect(indicator(container).dataset.phase).toBe('stretch');

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(indicator(container).style.transform).toBe('translate3d(200px, 0, 0)');
        expect(sessionStorage.getItem('bar')).toBe('me');
    });

    it('does not animate when the remembered item is the current one', () => {
        sessionStorage.setItem('bar', 'search');
        const { container } = render(<IconNav items={items()} activeKey="search" label="Principal" memoryKey="bar" />);

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(indicator(container).dataset.phase).toBe('idle');
    });

    it('never puts the indicator under the primary item', () => {
        const { container } = render(<IconNav items={items({ primary: true })} activeKey="me" label="Principal" />);

        expect(indicator(container).style.opacity).toBe('0');
    });

    it('runs an action item without moving the indicator', () => {
        const onSelect = vi.fn();
        const withAction: IconNavItem[] = [...items().slice(0, 2), { key: 'more', label: 'Más', icon: User as LucideIcon, onSelect }];
        const { container } = render(<IconNav items={withAction} activeKey="home" label="Principal" />);

        fireEvent.click(screen.getByRole('button', { name: 'Más' }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(indicator(container).dataset.phase).toBe('idle');
    });

    it('labels the navigation landmark', () => {
        render(<IconNav items={items()} activeKey="home" label="Navegación principal" />);

        expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    });
});
