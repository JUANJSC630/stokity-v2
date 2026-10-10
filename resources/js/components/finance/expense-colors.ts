/** Colors an expense category can have; the server stores the name, the screens draw the hex. */
export const COLOR_OPTIONS: { label: string; value: string; hex: string }[] = [
    { label: 'Azul', value: 'blue', hex: '#3b82f6' },
    { label: 'Morado', value: 'purple', hex: '#a855f7' },
    { label: 'Amarillo', value: 'yellow', hex: '#eab308' },
    { label: 'Cyan', value: 'cyan', hex: '#06b6d4' },
    { label: 'Rosa', value: 'pink', hex: '#ec4899' },
    { label: 'Naranja', value: 'orange', hex: '#f97316' },
    { label: 'Gris', value: 'gray', hex: '#6b7280' },
    { label: 'Rojo', value: 'red', hex: '#ef4444' },
    { label: 'Verde', value: 'green', hex: '#22c55e' },
    { label: 'Índigo', value: 'indigo', hex: '#6366f1' },
    { label: 'Pizarra', value: 'slate', hex: '#64748b' },
    { label: 'Lima', value: 'lime', hex: '#84cc16' },
];

export const DEFAULT_CATEGORY_COLOR = '#94a3b8';

/** The hex of a stored color name; a value that is already a hex (or any CSS color) is kept, and nothing falls back to a neutral gray. */
export function colorHex(color: string | null | undefined): string {
    if (!color) return DEFAULT_CATEGORY_COLOR;
    return COLOR_OPTIONS.find((option) => option.value === color)?.hex ?? (color.startsWith('#') ? color : DEFAULT_CATEGORY_COLOR);
}
