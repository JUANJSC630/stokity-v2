export const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super administrador',
    administrador: 'Administrador',
    encargado: 'Encargado',
    vendedor: 'Vendedor',
};

export function getRoleLabel(role: string | null | undefined): string {
    if (!role) return '';

    return ROLE_LABELS[role] ?? role;
}
