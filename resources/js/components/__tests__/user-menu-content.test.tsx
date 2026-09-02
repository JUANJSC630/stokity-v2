import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { UserMenuContent } from '../user-menu-content';

import type { User } from '@/types';

beforeAll(() => {
    vi.stubGlobal('route', (name: string) => `/${name.replace('.', '/')}`);
});

// Los ítems de Radix necesitan el contexto del menú para renderizarse.
const renderMenu = (user: User) =>
    render(
        <DropdownMenu open>
            <DropdownMenuTrigger />
            <DropdownMenuContent>
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>,
    );

const makeUser = (role: string): User =>
    ({
        id: 1,
        name: 'Kelly Castaneda',
        email: 'kellyc@luaccesorios.com',
        role,
        photo_url: '',
    }) as unknown as User;

describe('UserMenuContent', () => {
    // Regresión: el ítem estaba condicionado a role === 'administrador', así que
    // un encargado no tenía forma de llegar a su perfil ni a su contraseña.
    it.each(['administrador', 'encargado', 'vendedor'])('muestra Configuración para un %s', (role) => {
        renderMenu(makeUser(role));

        expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('siempre muestra Cerrar sesión', () => {
        renderMenu(makeUser('vendedor'));

        expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
    });
});
