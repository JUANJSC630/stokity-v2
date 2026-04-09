# Generar nuevas claves QZ Tray para un nuevo despliegue

QZ Tray usa un par de claves RSA (privada + certificado) para verificar que
los comandos de impresión vienen de tu servidor y no de un tercero.  
El servidor firma cada petición con la clave privada y QZ Tray la verifica
con el certificado público.

---

## Requisitos previos

- Tener **OpenSSL** instalado (viene por defecto en macOS y Linux).  
  Verificar: `openssl version`

---

## Paso 1 — Generar la clave privada RSA

```bash
openssl genrsa -out qztray-private.pem 2048
```

Esto crea el archivo `qztray-private.pem` con tu clave privada.  
**Guárdalo en un lugar seguro. Nunca lo subas al repositorio.**

---

## Paso 2 — Generar el certificado autofirmado

```bash
openssl req -new -x509 -key qztray-private.pem \
  -out qztray-cert.pem \
  -days 3650 \
  -subj "/CN=Mi Negocio QZ Tray/O=Mi Negocio/C=CO"
```

- `-days 3650` = válido por 10 años (puedes ajustarlo).
- El campo `CN` puede ser el nombre del negocio; no es crítico para el funcionamiento.
- Esto crea el archivo `qztray-cert.pem`.

---

## Paso 3 — Convertir ambos archivos a base64

```bash
base64 -i qztray-private.pem | tr -d '\n'
```

Copia la salida — será el valor de `PRINTER_PRIVATE_KEY_B64`.

```bash
base64 -i qztray-cert.pem | tr -d '\n'
```

Copia la salida — será el valor de `PRINTER_CERTIFICATE_B64`.

> **Nota (Linux):** usa `base64 -w 0` en vez de `base64 -i ... | tr -d '\n'`

---

## Paso 4 — Pegar los valores en el `.env` del servidor

Abre el `.env` del nuevo proyecto y reemplaza:

```env
PRINTER_PRIVATE_KEY_B64=<pega aqui el base64 de qztray-private.pem>
PRINTER_CERTIFICATE_B64=<pega aqui el base64 de qztray-cert.pem>
```

En Railway: ve a **Variables** del servicio y actualiza esas dos variables.  
Luego redespliega para que tomen efecto.

---

## Paso 5 — Instalar el certificado en QZ Tray (máquina del cliente)

El cliente que va a imprimir necesita que QZ Tray confíe en el certificado
nuevo. Hay dos formas:

### Opción A — Desde la UI de Stokity (recomendado)

1. El admin abre la página de configuración de impresora en Stokity.
2. Hace clic en **"Descargar certificado"** — descarga `stokity-qztray.pem`.
3. Copia ese archivo a la carpeta de certificados de QZ Tray:

| Sistema | Ruta |
|---------|------|
| Windows | `C:\Users\<usuario>\AppData\Roaming\qz\certs\` |
| macOS | `~/.qz/certs/` |
| Linux | `~/.qz/certs/` |

4. Reinicia QZ Tray.

### Opción B — Descarga directa desde el navegador

Visita esta URL en el navegador del cliente (con el servidor ya desplegado):

```
https://tu-dominio.com/qz/certificate/download
```

Guarda el archivo `.pem` en la carpeta de certificados mencionada arriba
y reinicia QZ Tray.

---

## Paso 6 — Verificar que todo funciona

1. Abre QZ Tray en la máquina del cliente (debe estar corriendo).
2. Inicia sesión en Stokity.
3. Ve a **Configuración → Impresora**.
4. Haz clic en **Conectar** — debe conectarse sin errores de firma.
5. Haz una impresión de prueba.

Si aparece un error como *"Certificate not trusted"*, verifica que el archivo
`.pem` está en la carpeta correcta y que QZ Tray fue reiniciado después de
copiarlo.

---

## Limpieza (opcional)

Una vez configurado el `.env`, puedes borrar los archivos `.pem` locales
(ya no los necesitas):

```bash
rm qztray-private.pem qztray-cert.pem
```

---

## Resumen rápido

```bash
# 1. Generar clave privada
openssl genrsa -out qztray-private.pem 2048

# 2. Generar certificado (10 años)
openssl req -new -x509 -key qztray-private.pem -out qztray-cert.pem -days 3650 -subj "/CN=QZ Tray/O=MiNegocio/C=CO"

# 3. Convertir a base64
base64 -i qztray-private.pem | tr -d '\n'   # → PRINTER_PRIVATE_KEY_B64
base64 -i qztray-cert.pem | tr -d '\n'       # → PRINTER_CERTIFICATE_B64

# 4. Pegar en .env o en Railway Variables
# 5. Copiar qztray-cert.pem a ~/.qz/certs/ en la máquina del cliente
# 6. Reiniciar QZ Tray
```
