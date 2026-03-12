/**
 * Descarga un archivo desde una URL usando fetch + blob.
 * Esto evita que el browser navegue a la URL (que causaría un "reload"
 * en apps Inertia cuando el servidor retorna un redirect en caso de error).
 *
 * Si el servidor retorna un error JSON (4xx/5xx), lanza un Error con el mensaje.
 */
export async function downloadFile(url: string): Promise<void> {
    const response = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        let message = 'Error al generar el archivo';
        try {
            const json = await response.json();
            message = json.error ?? message;
        } catch {
            // response no es JSON — dejar mensaje genérico
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
    const filename = match ? match[1].trim().replace(/^["']|["']$/g, '') : 'reporte';

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}
