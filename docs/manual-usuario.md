# Manual de Usuario — Stokity

**Sistema de Punto de Venta y Gestión Empresarial**

---

> Este manual está pensado para cualquier persona que use Stokity, sin importar su experiencia con tecnología. Explica en detalle cada módulo, cómo funciona, para qué sirve y cómo se conecta con el resto del sistema.

---

## Tabla de Contenido

1. [¿Qué es Stokity?](#1-qué-es-stokity)
2. [Cómo se Conectan Todos los Módulos](#2-cómo-se-conectan-todos-los-módulos)
3. [El Día a Día — Flujo Completo de Trabajo](#3-el-día-a-día--flujo-completo-de-trabajo)
4. [Acceso al Sistema](#4-acceso-al-sistema)
5. [Panel Principal (Dashboard)](#5-panel-principal-dashboard)
6. [Punto de Venta (POS)](#6-punto-de-venta-pos)
7. [Sesiones de Caja](#7-sesiones-de-caja)
8. [Ventas](#8-ventas)
9. [Devoluciones](#9-devoluciones)
10. [Créditos y Ventas a Plazo](#10-créditos-y-ventas-a-plazo)
11. [Clientes](#11-clientes)
12. [Catálogo de Productos](#12-catálogo-de-productos)
13. [Categorías](#13-categorías)
14. [Proveedores](#14-proveedores)
15. [Movimientos de Stock](#15-movimientos-de-stock)
16. [Finanzas](#16-finanzas)
17. [Gastos](#17-gastos)
18. [Métodos de Pago](#18-métodos-de-pago)
19. [Reportes](#19-reportes)
20. [Usuarios](#20-usuarios)
21. [Sucursales](#21-sucursales)
22. [Configuración del Sistema](#22-configuración-del-sistema)
23. [Impresión de Recibos](#23-impresión-de-recibos)
24. [Roles y Permisos — Quién Puede Hacer Qué](#24-roles-y-permisos--quién-puede-hacer-qué)
25. [Preguntas Frecuentes](#25-preguntas-frecuentes)

---

## 1. ¿Qué es Stokity?

Stokity es un sistema de gestión empresarial diseñado para negocios que venden productos o servicios. Funciona desde el navegador web, lo que significa que no necesita instalar nada especial en su computador: basta con abrir Chrome o Edge e ingresar a la dirección del sistema.

Con Stokity puede:

- **Vender** de forma rápida desde el Punto de Venta (POS).
- **Controlar el inventario** de sus productos en tiempo real.
- **Gestionar clientes** y ver el historial de sus compras.
- **Registrar ventas a crédito** con seguimiento de cuotas y pagos.
- **Llevar la contabilidad básica** del negocio (ingresos, gastos, ganancias).
- **Generar reportes** para tomar mejores decisiones.
- **Manejar varias sucursales** desde un solo lugar.
- **Imprimir recibos** en impresora térmica automáticamente.

---

## 2. Cómo se Conectan Todos los Módulos

Este es el punto más importante para entender Stokity: todo está conectado. Los módulos no funcionan de forma aislada, sino que se alimentan entre sí.

### El mapa de conexiones

```
┌─────────────┐     suministra      ┌──────────────┐
│  Proveedor  │ ─────────────────►  │   Producto   │
└─────────────┘                     └──────┬───────┘
                                           │ stock disponible
                                           ▼
┌─────────────┐    elige productos  ┌──────────────┐    crea venta
│   Cliente   │ ◄─────────────────  │     POS      │ ──────────────►
└──────┬──────┘                     └──────────────┘
       │ puede generar                     │ stock baja
       ▼                                   ▼
┌─────────────┐                    ┌──────────────┐
│  Crédito    │                    │   Venta      │
└─────────────┘                    └──────┬───────┘
                                          │ registrada en
                                          ▼
┌─────────────┐   suma gastos      ┌──────────────┐
│   Gastos    │ ─────────────────► │   Finanzas   │ ◄──── Reportes
└─────────────┘                    └──────────────┘
                                          ▲
┌─────────────┐  dinero del día          │
│    Caja     │ ─────────────────────────┘
└─────────────┘
```

### Lo que pasa en cada conexión

| Conexión | Lo que ocurre automáticamente |
|----------|------------------------------|
| **Proveedor → Producto** | Al registrar una entrada de mercancía, el stock del producto sube y queda el rastro de qué proveedor la entregó |
| **Producto → POS** | Solo aparecen en el POS los productos activos con stock disponible |
| **POS → Venta** | Al cobrar, se crea la venta y el stock del producto baja automáticamente |
| **Venta → Caja** | La venta queda asociada a la sesión de caja abierta en ese momento |
| **Venta → Crédito** | Si la venta queda pendiente de pago, se crea un crédito ligado a esa venta |
| **Cliente → Crédito** | Todo crédito debe tener un cliente registrado para saber a quién le cobrar |
| **Venta → Finanzas** | Los ingresos de ventas alimentan automáticamente el módulo de Finanzas |
| **Gastos → Finanzas** | Cada gasto registrado resta en el cálculo de ganancia neta |
| **Devolución → Stock** | Al registrar una devolución, el stock del producto sube de nuevo |
| **Devolución → Finanzas** | Las devoluciones reducen el total de ingresos en el período |

---

## 3. El Día a Día — Flujo Completo de Trabajo

Para entender mejor el sistema, aquí está cómo funciona un día típico de operación:

### Antes de abrir

1. **El administrador** ya configuró el sistema: creó los productos, las categorías, los métodos de pago y los usuarios.
2. **El vendedor** ingresa al sistema con su correo y contraseña.

### Al iniciar el turno

3. Si el negocio requiere sesión de caja, el vendedor **abre la caja** declarando el dinero inicial (ej: $50.000 de cambio).
4. El sistema ya está listo para vender.

### Durante el día

5. Los clientes llegan y el vendedor usa el **POS** para registrar las ventas.
6. Cada venta descuenta automáticamente el stock de los productos vendidos.
7. Si un cliente paga con efectivo, tarjeta o transferencia, el método queda registrado en la venta.
8. Si un cliente lleva un producto pero pagará después, se crea un **crédito**.
9. Si el negocio recibe mercancía nueva, el encargado registra una **entrada de stock** ligada al proveedor.
10. Si hay gastos del día (domicilio, papelería, etc.), el encargado los registra en **Gastos**.

### Al cerrar el turno

11. El vendedor **cierra la sesión de caja**: cuenta el dinero físico y lo declara.
12. El sistema compara lo que debería haber con lo declarado y muestra si hay diferencia.
13. El administrador o encargado puede revisar el **reporte del día** para ver las ventas, los gastos y la ganancia.

### Al final del mes

14. En **Finanzas** se ve el resumen completo: ingresos totales, costos, gastos y ganancia neta.
15. En **Reportes** se puede exportar información detallada para analizar o presentar.
16. Si hay productos con stock bajo, es momento de contactar al **proveedor** y registrar una nueva entrada.

---

## 4. Acceso al Sistema

### Cómo iniciar sesión

1. Abra el navegador web (se recomienda Chrome o Edge).
2. Ingrese la dirección del sistema que le proporcionó su administrador.
3. Escriba su **correo electrónico** y su **contraseña**.
4. Haga clic en **Iniciar sesión**.

### Olvidé mi contraseña

1. En la pantalla de inicio de sesión, haga clic en **¿Olvidaste tu contraseña?**
2. Escriba su correo electrónico y envíe el formulario.
3. Revise su bandeja de entrada (y la carpeta de spam por si acaso).
4. Haga clic en el enlace del correo, escriba su nueva contraseña y confirme.

### La pantalla principal

Una vez adentro verá:

- **Barra lateral izquierda:** El menú principal con acceso a todos los módulos. Los ítems que ve dependen de su rol (no todos los usuarios ven todo).
- **Área central:** El contenido del módulo activo.
- **Parte superior derecha:** Su nombre de usuario y acceso rápido al perfil y configuración.

---

## 5. Panel Principal (Dashboard)

El panel principal es lo primero que ve al ingresar. Es un resumen del estado del negocio en tiempo real.

### Tarjetas de resumen

| Tarjeta | Qué muestra |
|---------|------------|
| **Ventas hoy** | Número de transacciones completadas en el día actual |
| **Ingresos del mes** | Suma total en dinero de todas las ventas del mes en curso |
| **Productos registrados** | Cuántos productos hay en el catálogo (activos) |
| **Clientes registrados** | Total de clientes en el sistema |
| **Alertas de stock bajo** | Productos que tienen menos unidades de las configuradas como mínimo |

### Alertas de stock bajo

Esta es una función muy importante. Cuando el stock de un producto baja del mínimo que usted configuró, aparece una alerta aquí. Esto le indica que debe:

1. Contactar al proveedor correspondiente.
2. Hacer un pedido.
3. Cuando llegue la mercancía, registrar la entrada en **Movimientos de Stock**.

> **Hábito recomendado:** Revise el panel cada mañana antes de empezar a vender. Es su "termómetro" del negocio.

---

## 6. Punto de Venta (POS)

El POS es el corazón del sistema. Aquí se registran todas las ventas mientras se atiende al cliente, de forma rápida y sencilla.

### Cómo acceder

En la barra lateral, haga clic en **POS** (está resaltado en la parte superior del menú, no puede perdérselo).

### Requisito: Sesión de caja abierta

Si el administrador activó la opción de **sesión de caja obligatoria**, el sistema le mostrará un mensaje bloqueante antes de dejarle vender. Deberá abrir la caja primero. Vea la sección de [Sesiones de Caja](#7-sesiones-de-caja).

Si la sesión es opcional pero no hay ninguna abierta, verá un aviso en la parte superior pero podrá seguir vendiendo.

### Partes de la pantalla del POS

La pantalla está dividida en dos zonas:

**Zona izquierda — Catálogo:**
- Barra de búsqueda de productos en la parte superior.
- Lista de productos con imagen, nombre y precio.
- Los productos aparecen solo si están activos y tienen stock disponible.

**Zona derecha — Carrito:**
- Lista de productos agregados a la venta actual.
- Totales, descuentos y monto a cobrar.
- Selector de cliente.
- Selector de método de pago.
- Botón de cobro.

### Paso a paso: Cómo hacer una venta

**Paso 1 — Buscar el producto**

Escriba el nombre o el código del producto en la barra de búsqueda. Los resultados aparecen al instante mostrando imagen, nombre y precio.

Si tiene un **lector de código de barras**, coloque el cursor en la barra de búsqueda y escanee el producto. El sistema lo encuentra automáticamente.

**Paso 2 — Agregar al carrito**

Haga clic sobre el producto para agregarlo al carrito. Si el mismo producto aparece varias veces, puede:
- Hacer clic varias veces para agregar más unidades.
- Hacer clic en el número de cantidad en el carrito y escribir la cantidad directamente.
- Usar el botón **+** junto al producto en el carrito.

> **Atención con el stock:** Si intenta agregar más unidades de las que hay disponibles, el sistema se lo impedirá y le mostrará cuántas hay.

**Paso 3 — Asignar un cliente (opcional)**

En el campo **Cliente** del carrito puede buscar y seleccionar un cliente registrado. Esto es necesario si:
- La venta es a crédito (obligatorio).
- Quiere llevar historial de compras del cliente.

Si el cliente no está registrado o prefiere no asignarlo, déjelo en **"Consumidor Final"**. Esta opción es válida para ventas normales al público general.

Para buscar un cliente, empiece a escribir su nombre, documento o teléfono en el campo y selecciónelo de la lista que aparece.

**Paso 4 — Aplicar descuento (opcional)**

Si la venta tiene descuento:
1. Busque el campo o botón de descuento en el carrito.
2. Elija si el descuento es en **porcentaje** (ej: 10%) o en **valor fijo** (ej: $5.000).
3. Escriba el monto del descuento.
4. El total se recalcula automáticamente.

**Paso 5 — Precio variable**

Algunos Servicios pueden tener activada la opción de **precio variable** si asi lo desea. Para estos, puede cambiar el precio directamente en el carrito antes de cobrar. Esto es útil en negocios donde se negocia el precio con el cliente.

**Paso 6 — Agregar notas (opcional)**

Si necesita anotar algo sobre la venta (ej: "entregar el martes", "cliente pidió factura"), escriba en el campo **Notas** al final del carrito.

**Paso 7 — Seleccionar el método de pago**

En la parte del carrito verá los métodos de pago disponibles (los que el administrador configuró). Haga clic en el que el cliente usará.

Si paga en **efectivo**:
- Aparecerá el campo **Recibido**. Escriba el monto exacto que el cliente entrega.
- El sistema calcula automáticamente el cambio a devolver y lo muestra en pantalla.

**Paso 8 — Cobrar**

Haga clic en el botón **Cobrar** o presione la tecla **F9**. La venta queda registrada y:
- El stock de cada producto baja automáticamente.
- La venta queda asociada a la sesión de caja abierta.
- Si tiene impresora configurada con impresión automática, el tiquete se imprime solo.
- El carrito se vacía para la siguiente venta.

### Atajos de teclado en el POS

| Tecla | Acción |
|-------|--------|
| **/** | Enfocar la barra de búsqueda de productos |
| **F9** | Cobrar la venta actual |
| **?** | Ver / ocultar la lista completa de atajos |

### Cotizaciones (ventas guardadas sin cobrar)

Una cotización es una venta iniciada pero no cobrada. Se usa cuando:
- Está atendiendo a un cliente y necesita atender a otro al mismo tiempo.
- El cliente se va a buscar el dinero y regresa.

**Para guardar una cotización:**
- Haga clic en el botón **Guardar cotización** (en la parte inferior derecha del carrito, debajo del botón Cobrar).

**Importante — El stock se reserva:** Cuando se guarda una cotización, las unidades del carrito quedan como **stock reservado**. Esas unidades se apartan y no pueden venderse a otro cliente mientras la cotización esté activa.

**Para retomar una cotización:**
- En el POS, haga clic en el ícono de **Cotizaciones pendientes** (aparece con un número en rojo si hay cotizaciones guardadas).
- Se abre el panel lateral con la lista de cotizaciones.
- Haga clic en la que desea retomar. El carrito se carga con los productos y continúa desde donde estaba.

**Para eliminar una cotización:**
- Abra el panel de **Cotizaciones pendientes**.
- Haga clic en el ícono de eliminar junto a la cotización.
- El stock reservado se libera automáticamente.

### Indicador de sesión de caja en el POS

En la parte superior de la pantalla del POS verá el estado de la caja actual. Desde ahí puede:
- Ver si la caja está abierta.
- Hacer clic en **Ingreso de efectivo** para registrar dinero que entra a la caja sin ser una venta.
- Hacer clic en **Egreso de efectivo** para registrar dinero que sale de la caja (gastos pequeños).

---

## 7. Sesiones de Caja

Las sesiones de caja son el control del dinero físico que maneja el negocio. Cada turno de trabajo tiene su propia sesión: se abre al inicio y se cierra al final.

### ¿Para qué sirve?

- Saber exactamente cuánto dinero en efectivo debería haber en la caja en todo momento.
- Registrar entradas y salidas de dinero que no son ventas.
- Detectar diferencias entre el dinero real y el esperado.
- Saber qué vendió cada turno y qué vendedor manejó la caja.
- Llevar un historial completo de todos los turnos.

### Cómo abrir una sesión de caja

1. En la barra lateral, haga clic en **Historial de Caja**.
2. Si no hay ninguna sesión abierta, verá el botón **Abrir caja**.
3. También puede abrir la caja directamente desde el POS si el sistema le muestra el mensaje de aviso.
4. En el campo **Fondo inicial** escriba el dinero con que inicia la caja para dar cambios (ej: $50.000). Si no tiene nada, escriba 0.
5. Puede escribir una nota en el campo **Notas (opcional)**.
6. Haga clic en **Abrir caja**.

La caja ya está abierta y puede empezar a vender.

### Movimientos durante el turno

Durante el turno pueden ocurrir entradas y salidas de dinero que no son ventas. Por ejemplo:
- El jefe trae $100.000 para dar cambio → **Entrada de efectivo**.
- Se paga el domicilario con dinero de la caja → **Salida de efectivo**.

Para registrar un movimiento:
1. En el POS, haga clic en **Ingreso de efectivo** o **Egreso de efectivo** según corresponda.
2. Complete los campos:
   - **Monto \***: El valor del movimiento.
   - **Concepto \***: Una descripción del motivo (ej: "Pago proveedor", "Fondo de cambio").
   - **Notas (opcional)**: Información adicional.
3. Confirme.

Cada movimiento queda registrado con hora, monto, concepto y usuario.

### Cómo cerrar la sesión de caja

1. Vaya a **Historial de Caja** y haga clic en **Cerrar caja**, o use el botón de cierre en el POS.
2. El sistema muestra el título **Cierre de Caja — Turno #N** y un resumen del turno:
   - Total vendido por cada método de pago.
   - Ingresos y egresos manuales registrados.
   - Si el negocio no tiene activo el cierre ciego, verá **Efectivo esperado en caja** — cuánto debería haber según el sistema.
3. **Cuente el dinero físico** que tiene en la caja.
4. En el campo **Efectivo contado físicamente** escriba el monto que contó. También puede usar la opción **Desglose por denominación** para contar billete por billete y que el sistema sume automáticamente.
5. El sistema calcula si hay diferencia (sobrante o faltante).
6. En **Notas del cierre (opcional)** puede escribir cualquier observación.
7. Haga clic en **Confirmar cierre de caja**.

> **Nota para vendedores:** Si el administrador activó el cierre ciego, usted no verá el "Efectivo esperado" antes de declarar. Solo escribe lo que contó. Esto es intencional para que el número esperado no influya en lo que se declara.

### Historial de sesiones

En **Historial de Caja** puede ver todas las sesiones anteriores. Cada sesión muestra:
- Fecha y hora de apertura y cierre.
- Nombre del vendedor que la manejó.
- Total vendido por cada método de pago.
- Monto de apertura y cierre declarado.
- Diferencia (sobrante o faltante, en verde o rojo).

Al hacer clic en una sesión puede ver el **reporte detallado** de esa sesión, que también se puede imprimir.

---

## 8. Ventas

El módulo de Ventas es el archivo histórico de todas las transacciones del negocio.

### Cómo acceder

En la barra lateral, haga clic en **Ventas**.

### ¿Qué puede ver aquí?

La lista muestra todas las ventas con:
- **Código de venta** (un número único para identificarla).
- **Fecha y hora**.
- **Cliente** (o "Consumidor Final" si no se asignó uno).
- **Vendedor** que realizó la venta.
- **Total**.
- **Método de pago**.
- **Estado** (completada o pendiente).

### Filtrar ventas

Puede buscar ventas específicas usando los filtros:
- **Rango de fechas:** "Del 1 al 15 de este mes".
- **Estado:** Solo completadas, solo pendientes, o todas.
- **Cliente:** Escriba el nombre o documento del cliente.

### Ver el detalle de una venta

Haga clic sobre cualquier venta para ver su detalle completo:
- Lista de todos los productos vendidos con precio unitario, cantidad y subtotal.
- Descuento aplicado (si hubo).
- Impuesto (si aplica).
- Total final.
- Monto pagado por el cliente y cambio entregado.
- Nota de la venta (si se escribió una).
- Si la venta tuvo devoluciones, aparecen aquí también.

### Estados de una venta

| Estado | Qué significa |
|--------|--------------|
| **Completada** | La venta fue cobrada totalmente. No se puede modificar. |
| **Pendiente** | Fue guardada como cotización en el POS pero no cobrada todavía. El stock está reservado. |

---

## 9. Devoluciones

Una devolución ocurre cuando un cliente regresa productos de una venta ya realizada.

### ¿Cómo afecta al sistema?

Una devolución NO es solo una anotación. Tiene impacto real en todo el sistema:

- **El stock sube:** Los productos devueltos vuelven al inventario automáticamente.
- **Las finanzas se ajustan:** El monto de la devolución se descuenta de los ingresos del período.
- **Los reportes reflejan la devolución:** Aparece en el reporte de devoluciones y en el detalle de ventas.

### Cómo registrar una devolución

1. Vaya al módulo de **Ventas**.
2. Encuentre la venta original que el cliente quiere devolver (use la búsqueda si es necesario).
3. Abra el detalle de esa venta.
4. Haga clic en **Registrar devolución**.
5. Seleccione **qué productos** devuelve el cliente y **cuántas unidades** de cada uno.
6. Escriba el **motivo de la devolución** (ej: "Producto defectuoso", "Talla incorrecta").
7. Confirme la devolución.

El sistema registra la devolución, sube el stock y genera un comprobante de devolución que puede imprimir si tiene impresora configurada.

> **Importante:** Solo puede hacer devoluciones de ventas **completadas**. Las ventas pendientes se cancelan directamente en el POS sin registrar una devolución.

### Ver el historial de devoluciones

Puede ver todas las devoluciones en el módulo de **Reportes → Devoluciones**, donde encontrará filtros por fecha y puede exportar la información.

---

## 10. Créditos y Ventas a Plazo

El módulo de Créditos es para cuando un cliente no paga todo en el momento, sino que queda debiendo y pagará después (en partes o en una fecha acordada).

### ¿Cómo se relaciona con otros módulos?

- **Necesita un cliente registrado:** No se puede crear un crédito a "Consumidor Final". El cliente debe estar en el sistema porque es a quien se le cobra.
- **Puede venir de una venta:** Cuando se hace una venta y el cliente no paga completo, se puede convertir en un crédito.
- **Aparece en Finanzas:** Los créditos activos aparecen en el módulo de Finanzas como "Cuentas por cobrar" — dinero que el negocio tiene pendiente de recibir.
- **Alerta en el sidebar:** El número rojo junto a "Créditos" en el menú indica cuántos créditos están vencidos.

### Tipos de crédito

Stokity tiene cuatro tipos de crédito, cada uno pensado para una situación diferente:

#### 1. Separado
El cliente aparta con un abono. **El producto se entrega al completar el pago.**

El producto queda como **stock reservado** desde que se crea el separado: nadie más puede comprar esa unidad mientras esté apartada. Cuando el cliente termina de pagar, se le entrega el producto.

**Ejemplo:** Un televisor de $800.000. El cliente paga $200.000 hoy y el resto en 3 semanas. El televisor queda guardado para él.

#### 2. Cuotas
El producto se entrega de inmediato. **El cliente paga en cuotas mensuales.**

El stock baja inmediatamente porque el cliente ya se lleva el producto. Al crear el crédito se define el número de cuotas y la fecha de la última.

**Ejemplo:** Una nevera de $1.500.000. El cliente se la lleva hoy y paga $300.000 cada mes durante 5 meses.

#### 3. Fecha acordada
El producto se entrega de inmediato. **El cliente paga todo en una fecha acordada.**

El stock baja inmediatamente.

**Ejemplo:** "Me llevo esto y le pago el viernes que me pagan."

#### 4. Reservado
Solo se reserva el producto. Sin abono. **El cliente regresa a pagar y a recoger.**

Similar al Separado, el stock queda reservado para ese cliente, pero no se registra abono inicial.

### Cómo crear un crédito

1. En la barra lateral, haga clic en **Créditos**.
2. Haga clic en **Nuevo crédito**.
3. En **Cliente**, busque al cliente por nombre o documento. Si no existe, créelo primero en el módulo de Clientes.
4. En **Productos**, busque y agregue los productos que el cliente lleva o aparta.
5. En **Modalidad del crédito**, seleccione el tipo (Separado, Cuotas, Fecha acordada, Reservado).
6. En **Condiciones**, configure los detalles según la modalidad:
   - **Cuotas:** Elija el número de cuotas y la fecha de la última cuota.
   - **Fecha acordada:** Seleccione la fecha límite de pago.
   - **Separado / Reservado:** No requieren fecha, el producto queda guardado hasta que el cliente regrese.
7. En **Abono inicial (opcional)** escriba cuánto paga el cliente hoy (puede ser $0 para Reservado).
8. Agregue **Notas (opcional)** si es necesario.
9. Haga clic en **Guardar**.

### Seguimiento de créditos

En la lista de créditos hay cuatro pestañas:

- **Activos:** Créditos vigentes y al día.
- **Vencidos:** Créditos que ya pasaron su fecha límite sin pago completo. Se marcan en rojo.
- **Completados:** Créditos pagados en su totalidad.
- **Todos:** Vista completa sin filtro de estado.

Cada crédito muestra una **barra de progreso** que indica qué porcentaje del total ya fue pagado.

### Registrar un abono a un crédito

1. En la lista de créditos, haga clic sobre el crédito del cliente.
2. Verá el **Historial de abonos** y el saldo pendiente.
3. Haga clic en **Registrar abono**.
4. En el campo **Monto del abono** escriba cuánto paga el cliente hoy. El sistema no le permitirá registrar un monto mayor al saldo restante.
5. Seleccione el método de pago.
6. Agregue **Notas (opcional)** si lo necesita.
7. Confirme.

El saldo pendiente se actualiza en tiempo real. Cuando llega a cero, el crédito cambia automáticamente a estado **Completado**.

### Cancelar un crédito

Si el cliente desiste o no se puede cobrar:
1. Abra el detalle del crédito.
2. Haga clic en **Cancelar crédito**.
3. Si los productos tenían stock reservado (ej: un separado), ese stock se libera automáticamente y vuelve a estar disponible para otros clientes.

---

## 11. Clientes

El módulo de Clientes guarda la información de todas las personas que compran en el negocio.

### Por qué es importante registrar clientes

- Para crear **ventas a crédito** (es obligatorio tener el cliente registrado).
- Para llevar el **historial de compras** de cada cliente.
- Para ver cuánto ha comprado un cliente y qué productos prefiere.
- Para tener datos de contacto disponibles.
- Para saber si un cliente tiene créditos activos o vencidos.

### Cómo registrar un cliente

1. En la barra lateral, haga clic en **Clientes**.
2. Haga clic en **Nuevo cliente** o en el botón **+**.
3. Complete los datos:

| Campo | Obligatorio | Descripción |
|-------|------------|-------------|
| **Nombre completo** | Sí | Nombre del cliente tal como es |
| **Documento** | No | Cédula o NIT |
| **Teléfono** | No | Para llamar o enviar mensajes |
| **Correo electrónico** | No | Para enviar comprobantes |
| **Dirección** | No | Dirección del cliente |
| **Fecha de nacimiento** | No | Útil para recordar fechas especiales |

4. Haga clic en **Guardar**.

### Ver el perfil completo de un cliente

Haga clic sobre el nombre del cliente para abrir su perfil. Verá:
- Sus datos de contacto.
- **Historial de compras:** Todas las ventas realizadas, con fecha y monto.
- **Créditos activos:** Si tiene deudas pendientes con el negocio.
- **Total comprado** en el negocio (valor acumulado de todas sus compras).

### Buscar un cliente

Use la barra de búsqueda en la lista de clientes. Puede buscar por:
- Nombre completo o parcial.
- Número de documento (cédula).
- Teléfono.

> **Consejo:** Registre a sus clientes frecuentes desde el inicio. Con el tiempo, el historial de compras se vuelve muy valioso para entender qué prefieren y ofrecerles mejores productos.

---

## 12. Catálogo de Productos

El catálogo es la lista completa de todos los productos y servicios que vende el negocio.

### ¿Cómo se conecta con otros módulos?

- **Con el POS:** Solo aparecen en el POS los productos que están en el catálogo, estén **activos** y tengan **stock disponible** (para productos físicos).
- **Con Stock:** Cada vez que se registra una entrada o salida de mercancía, el stock del producto en el catálogo cambia.
- **Con Ventas:** Al vender, el stock baja automáticamente. Al devolver, el stock sube.
- **Con Finanzas:** El **precio de compra** que registre aquí se usa para calcular el costo de ventas y la ganancia bruta.
- **Con Proveedores:** Un producto puede tener uno o varios proveedores asociados, para saber de quién comprarlo.
- **Con Categorías:** Cada producto pertenece a una categoría, lo que permite filtrar y organizar.

### Cómo agregar un producto

1. En la barra lateral, haga clic en **Catálogo**.
2. Haga clic en **Nuevo producto** o el botón **+**.
3. Complete los campos:

| Campo | Obligatorio | Descripción |
|-------|------------|-------------|
| **Nombre** | Sí | Cómo aparecerá en el POS y en los reportes |
| **Código** | No | Código de barras o código interno. Puede hacer clic en "Generar código" para que el sistema cree uno automáticamente |
| **Tipo** | Sí | "Producto" (tiene inventario físico) o "Servicio" (no tiene inventario) |
| **Descripción** | No | Detalle adicional del producto |
| **Precio de compra** | No | Lo que le cuesta al negocio. Importante para calcular ganancias |
| **Precio de venta** | Sí | Lo que paga el cliente |
| **Impuesto (IVA)** | No | Porcentaje de impuesto que aplica al producto |
| **Stock actual** | No | Cuántas unidades hay al momento de crearlo |
| **Stock mínimo** | No | Si baja de este número, el sistema genera una alerta en el Dashboard |
| **Categoría** | No | A qué grupo pertenece (debe existir previamente en Categorías) |
| **Imagen** | No | Foto del producto. Se muestra en el POS para identificarlo fácilmente |
| **Estado** | Sí | Activo (aparece en el POS) o Inactivo (no aparece en el POS) |
| **Precio variable** | No | Si se activa, el vendedor puede cambiar el precio en el POS al momento de la venta |

4. Haga clic en **Guardar**.

### Diferencia entre Producto y Servicio

**Producto:** Tiene inventario físico. El stock sube cuando entra mercancía y baja cuando se vende. Ejemplos: zapatos, bebidas, medicamentos, ropa.

**Servicio:** No tiene inventario. El sistema no lleva conteo. Ejemplos: corte de cabello, consulta médica, lavado de carro, instalación de un equipo.

### La imagen del producto

Subir una imagen es opcional pero muy recomendado. En el POS, los productos con imagen son mucho más fáciles de reconocer visualmente, especialmente cuando hay muchos productos similares. La imagen debe ser un archivo JPG, PNG o WebP desde su computador.

### El precio variable

Cuando activa "precio variable" en un producto, el vendedor puede modificar el precio en el momento de agregarlo al carrito en el POS. Esto es útil en negocios donde:
- Se negocia el precio según el cliente.
- El precio cambia según la cantidad.
- Hay descuentos especiales que el vendedor maneja directamente.

### El código de producto

El código es el identificador único del producto. Puede ser:
- El **código de barras** que viene impreso en el empaque.
- Un código interno que usted invente.
- Un código generado automáticamente por el sistema.

Si usa lector de código de barras, es importante que el código registrado en Stokity coincida exactamente con el que está en el empaque del producto.

### Inactivar un producto

Si un producto se deja de vender temporalmente, no tiene que borrarlo. Cámbielo a **Inactivo**:
1. Abra el producto.
2. Haga clic en **Editar**.
3. Cambie el estado a "Inactivo".
4. Guarde.

El producto desaparece del POS pero permanece en el sistema. Puede reactivarlo cuando quiera.

### Eliminar y recuperar productos (Papelera)

Si elimina un producto, no se borra definitivamente. Va a la **papelera**. Puede recuperarlo:
1. En el catálogo, busque el botón **Papelera** o **Productos eliminados**.
2. Encuentre el producto.
3. Haga clic en **Restaurar**.

Si está seguro de que quiere borrar el producto para siempre, use la opción **Eliminar definitivamente** (esto no se puede deshacer).

### Ver el historial de movimientos de un producto

En el detalle de cada producto puede ver el historial completo de cambios en su stock: cuándo entró mercancía, cuándo salió, cuándo se hizo un ajuste. Esto permite rastrear cualquier irregularidad.

---

## 13. Categorías

Las categorías son grupos que ayudan a organizar los productos.

### ¿Para qué sirven?

- Agrupar productos relacionados (ej: "Bebidas", "Lácteos", "Papelería").
- Filtrar productos fácilmente en el catálogo y en el POS.
- Ver en los reportes qué categorías venden más.

### Cómo crear una categoría

1. En la barra lateral, haga clic en **Categorías**.
2. Haga clic en **Nueva categoría**.
3. Escriba el nombre.
4. Haga clic en **Guardar**.

> **Consejo:** Cree las categorías **antes** de empezar a registrar productos para poder asignarlas desde el inicio. Use nombres claros y cortos.

### Eliminar y recuperar categorías

Al igual que los productos, las categorías tienen papelera. Si elimina una categoría, puede recuperarla desde **Categorías → Papelera**.

> **Atención:** Si elimina una categoría que tiene productos asignados, esos productos quedarán sin categoría. Se recomienda reasignarlos antes de eliminar la categoría.

---

## 14. Proveedores

Los proveedores son las empresas o personas de las que compra la mercancía.

### ¿Cómo se conecta con otros módulos?

- **Con Productos:** Un proveedor puede suministrar uno o varios productos. Esta relación queda guardada en el sistema.
- **Con Movimientos de Stock:** Cuando registra una entrada de mercancía (ingreso), debe indicar qué proveedor la entregó. Así queda el rastro de cada compra.
- **Con el Dashboard:** Si hay alertas de stock bajo, saber qué proveedor suministra ese producto le ayuda a saber a quién llamar.

### Cómo registrar un proveedor

1. En la barra lateral, haga clic en **Proveedores**.
2. Haga clic en **Nuevo proveedor**.
3. Complete los datos:

| Campo | Descripción |
|-------|------------|
| **Nombre de la empresa** | Nombre del proveedor tal como aparece en sus facturas |
| **NIT** | Número de identificación tributaria del proveedor |
| **Nombre del contacto** | La persona específica con quien habla normalmente |
| **Teléfono** | Para hacer pedidos o consultas |
| **Correo electrónico** | Para enviar o recibir pedidos |
| **Dirección** | Dirección física del proveedor |
| **Notas** | Cualquier información adicional (horarios, condiciones de pago, etc.) |

4. Haga clic en **Guardar**.

### Ver el perfil de un proveedor

Al hacer clic en el nombre de un proveedor, verá:
- Sus datos de contacto.
- Lista de productos que suministra.
- Historial de entradas de mercancía que ha hecho con este proveedor.

Esto le permite llevar un control de cuánto y qué tan seguido compra a cada proveedor.

---

## 15. Movimientos de Stock

Este módulo registra cada vez que el inventario de un producto cambia por razones distintas a una venta normal.

### ¿Por qué es importante?

Imagine que tiene 50 unidades de un producto y de repente solo hay 30. ¿Qué pasó con las 20? El módulo de movimientos de stock le da la respuesta: puede ver si hubo una venta, un ajuste, una pérdida o una devolución al proveedor.

### Conexiones con otros módulos

- **Proveedor → Stock:** Cuando registra un ingreso, el stock del producto sube y queda el registro de qué proveedor lo entregó.
- **Stock → Finanzas:** El costo de las entradas de mercancía alimenta el cálculo del costo de ventas en Finanzas.
- **Ventas → Stock:** Las ventas bajan el stock automáticamente (no aparecen en este módulo como movimiento manual, se gestionan solos).
- **Devoluciones → Stock:** Las devoluciones suben el stock automáticamente.

### Tipos de movimiento

| Tipo en la pantalla | Cuándo se usa | Efecto en el stock |
|--------------------|--------------|-------------------|
| **Ingreso** | Llegó mercancía nueva del proveedor | Stock sube ↑ |
| **Salida** | Productos que salen por razones distintas a una venta (consumo interno, muestra, obsequio) | Stock baja ↓ |
| **Ajuste de Stock** | Corrección tras contar físicamente; se escribe el stock real que hay en bodega | El sistema calcula la diferencia y ajusta ↑↓ |
| **Baja de Inventario** | Productos dañados, vencidos, robados o perdidos | Stock baja ↓ |
| **Devolución a Proveedor** | Mercancía que se regresa al proveedor (defectuosa, equivocada) | Stock baja ↓ |

### Cómo registrar una entrada de mercancía (Ingreso)

Este es el movimiento más común. Se hace cada vez que llega un pedido del proveedor.

1. En la barra lateral, haga clic en **Movimientos de Stock**.
2. Haga clic en **Nuevo Movimiento de Stock**.
3. Busque y seleccione el **Producto**.
4. En **Tipo de Movimiento** seleccione **Ingreso**.
5. En **Proveedor** seleccione quién entregó la mercancía (puede dejarlo en "Sin proveedor" si no aplica).
6. En **Cantidad a ingresar** escriba el número de unidades que llegaron.
7. En **Costo Unitario** escriba el precio al que compró cada unidad. Esto es importante para que Finanzas calcule el costo de ventas correctamente.
8. En **Referencia** escriba el número de factura o remisión del proveedor.
9. En **Notas** agregue cualquier observación adicional.
10. Haga clic en **Guardar**.

El stock del producto sube inmediatamente.

### Cómo hacer un ajuste de inventario

Después de un conteo físico, si el sistema dice que hay una cantidad diferente a lo que hay en la bodega:

1. En **Movimientos de Stock**, haga clic en **Nuevo Movimiento de Stock**.
2. Seleccione el **Producto**.
3. En **Tipo de Movimiento** seleccione **Ajuste de Stock**.
4. En el campo **Nuevo stock total** escriba el número **exacto de unidades que hay físicamente** en ese momento. El sistema calcula la diferencia y ajusta el stock automáticamente.
5. Escriba el motivo en **Notas** (ej: "Conteo mensual", "Diferencia detectada").
6. Haga clic en **Guardar**.

### Ver el historial de movimientos de un producto

Puede filtrar los movimientos por producto para ver el historial completo de ese ítem específico. Esto ayuda a entender, por ejemplo, por qué un producto se agota rápido.

---

## 16. Finanzas

El módulo de Finanzas le muestra la salud económica del negocio en términos claros: cuánto entró, cuánto costó, cuánto se gastó y cuánto queda de ganancia.

### ¿Cómo se alimenta este módulo?

Finanzas no requiere que usted ingrese datos directamente. Toma información de otros módulos automáticamente:

- **Ingresos:** Vienen de las ventas registradas en el POS y el módulo de Ventas.
- **Costo de ventas:** Se calcula con el precio de compra de los productos vendidos (registrado en el catálogo).
- **Gastos:** Vienen del módulo de Gastos.
- **Cuentas por cobrar:** Vienen de los créditos activos.

### ¿Qué muestra la pantalla de Finanzas?

#### Resumen del período

Puede seleccionar el período que quiere analizar:
- Esta semana
- Este mes
- Mes pasado
- Este año
- Personalizado (elige fechas)

#### Los números clave

| Concepto | Qué significa |
|----------|--------------|
| **Ingresos (Ventas)** | Todo el dinero que entró por ventas en el período |
| **Costo de Ventas** | Lo que le costaron al negocio los productos que vendió |
| **Utilidad Bruta** | Ingresos menos Costo de Ventas. La ganancia antes de gastos. |
| **Gastos Operativos** | Todos los gastos del negocio (arriendo, servicios, salarios, etc.) |
| **Utilidad Neta** | Lo que realmente ganó el negocio después de todos los gastos. |

**Ejemplo práctico:**
- Vendió por $10.000.000 en el mes.
- Los productos vendidos le costaron $6.000.000.
- **Utilidad Bruta = $4.000.000**
- Los gastos del mes (arriendo, servicios, etc.) fueron $1.500.000.
- **Utilidad Neta = $2.500.000** — Eso es lo que ganó el negocio.

#### Desglose de gastos

Más abajo verá los gastos divididos por categoría, para saber exactamente en qué se va el dinero. Por ejemplo: "El arriendo representa el 40% de los gastos del mes."

#### Cuentas por cobrar

Muestra cuánto dinero tienen los clientes pendiente de pagar en créditos activos. Este dinero "está ahí" pero aún no ha entrado a la caja.

---

## 17. Gastos

Los gastos son todos los costos del negocio que no son compra de mercancía: arriendo, servicios públicos, salarios, internet, papelería, etc.

### ¿Cómo se conecta con otros módulos?

- Cada gasto que registre aquí **reduce la utilidad neta** en el módulo de Finanzas automáticamente.
- Los gastos se pueden ver filtrados por categoría en el desglose de Finanzas.

### Cómo registrar un gasto

1. En la barra lateral, haga clic en **Gastos**.
2. Haga clic en **Nuevo gasto** o el botón **+**.
3. Complete los campos:

| Campo | Descripción |
|-------|------------|
| **Categoría** | A qué tipo de gasto pertenece (ej: Arriendo, Servicios, Salarios) |
| **Monto** | El valor del gasto |
| **Fecha** | Cuándo ocurrió el gasto |
| **Descripción** | Breve explicación (ej: "Pago arriendo local noviembre") |
| **Notas** | Información adicional opcional |

4. Haga clic en **Guardar**.

### Categorías de gastos

Las categorías ayudan a organizar y analizar los gastos. Si no existe la categoría que necesita, puede crearla desde la misma pantalla de gastos. Ejemplos de categorías útiles:
- Arriendo
- Servicios públicos (agua, luz, gas)
- Internet y teléfono
- Salarios y prestaciones
- Publicidad y marketing
- Transporte y domicilios
- Mantenimiento y reparaciones
- Papelería y útiles de oficina

### Plantillas de gastos fijos

Si tiene gastos que se repiten todos los meses con el mismo valor (como el arriendo o el servicio de internet), puede crear una **plantilla** para no tener que ingresar los datos cada mes:

1. En la sección de Gastos, busque **Plantillas de gastos fijos**.
2. Haga clic en **Nueva plantilla**.
3. Escriba el nombre (ej: "Arriendo local"), la categoría y el monto.
4. Guarde la plantilla.

Cada mes, cuando vaya a registrar los gastos fijos, puede usar las plantillas para cargar todos de una vez con un clic, en lugar de ingresarlos uno por uno.

---

## 18. Métodos de Pago

Aquí se definen las formas en que los clientes pueden pagar. Los métodos configurados aparecen en el POS al momento de cobrar.

### ¿Cómo se conecta con otros módulos?

- Los métodos de pago disponibles en el **POS** son exactamente los que estén activos aquí.
- Las **sesiones de caja** separan los totales por método de pago (efectivo, tarjeta, transferencia, otros) para el cuadre de caja.
- Los **reportes** muestran las ventas agrupadas por método de pago.

### Cómo agregar un método de pago

1. En la barra lateral *(solo administrador)*, busque **Métodos de Pago**.
2. Haga clic en **Nuevo método de pago**.
3. Escriba el **nombre** (ej: "Nequi", "Daviplata", "Tarjeta Crédito", "Efectivo").
4. Guarde.

### Activar o desactivar

Si temporalmente no acepta un método, desactívelo con el interruptor. No aparecerá en el POS hasta que lo reactive.

### Cambiar el orden

Puede arrastrar y soltar los métodos para cambiar el orden en que aparecen en el POS. Ponga primero el que usan más seguido sus clientes (generalmente efectivo).

---

## 19. Reportes

Los reportes le dan información detallada para entender el negocio y tomar mejores decisiones.

### ¿Cómo acceder?

En la barra lateral, haga clic en **Reportes** (visible solo para administrador y encargado).

### Reporte Principal

Es el resumen general. Muestra:
- Total de ventas y monto total en el período seleccionado.
- **Comparación con el período anterior** (si este mes vendió más o menos que el mes pasado).
- **Top 5 productos más vendidos:** Los productos que más salida tuvieron.
- **Top 5 vendedores:** Los que más ventas registraron.
- **Resumen por sucursal** si el negocio tiene varias.

### Detalle de Ventas

Una lista completa de cada transacción:
- Fecha, código de venta, cliente, vendedor, productos, descuento, total, método de pago.
- **Filtros:** Por rango de fechas, sucursal, vendedor, estado.
- **Exportar:** Puede descargar la información en **Excel** (para analizar en hoja de cálculo) o en **PDF** (para imprimir o enviar).

### Reporte de Productos

- Qué productos se vendieron, cuántas unidades y cuánto dinero generaron.
- Útil para decidir qué pedir más, qué dejar de vender o qué promover.
- Se puede exportar a Excel o PDF.

### Reporte de Vendedores

- Cuánto vendió cada vendedor en el período.
- Número de transacciones realizadas por cada uno.
- Valor promedio de venta.
- Comparación entre vendedores.
- Exportable a Excel o PDF.

### Balance de Caja

- Resumen de cada sesión de caja: apertura, cierre, total vendido por método de pago, diferencias.
- Filtros por fecha y sucursal.
- Permite detectar patrones de diferencias (sobrantes o faltantes frecuentes).

### Reporte de Devoluciones

- Cuántos productos fueron devueltos en el período.
- Qué productos se devuelven con más frecuencia.
- Motivos de devolución.
- Impacto económico en los ingresos.
- Exportable a Excel o PDF.

### Reporte de Sucursales *(solo administrador)*

- Comparación de ventas entre todas las sucursales del negocio.
- Qué sucursal vende más, cuál tiene más gastos, cuál es más rentable.
- Exportable.

### Cómo usar los filtros en reportes

1. Seleccione el **rango de fechas** en la parte superior.
2. Si tiene varias sucursales, elija si quiere ver **todas** o solo una específica.
3. Aplique los filtros adicionales que necesite (vendedor, categoría, etc.).
4. El reporte se actualiza automáticamente.

### Cómo exportar un reporte

1. Configure el reporte con los filtros deseados.
2. Busque los botones **Exportar Excel** o **Exportar PDF** en la parte superior del reporte.
3. Haga clic y el archivo se descargará a su computador.

---

## 20. Usuarios

Este módulo permite al administrador gestionar quién tiene acceso al sistema y qué puede hacer cada persona.

### Cómo agregar un usuario

1. En la barra lateral *(solo administrador)*, haga clic en **Usuarios**.
2. Haga clic en **Nuevo usuario**.
3. Complete los datos:

| Campo | Descripción |
|-------|------------|
| **Nombre completo** | Nombre del empleado |
| **Correo electrónico** | Será su "nombre de usuario" para ingresar al sistema |
| **Contraseña** | La contraseña inicial. El empleado puede cambiarla después desde su perfil |
| **Rol** | Administrador, Encargado o Vendedor (ver sección de roles) |
| **Sucursal** | A cuál sucursal pertenece (solo verá los datos de esa sucursal) |

4. Haga clic en **Guardar**.

El empleado ya puede ingresar al sistema con su correo y contraseña.

### Editar un usuario

1. En la lista de usuarios, haga clic sobre el nombre del empleado.
2. Haga clic en **Editar**.
3. Cambie lo que necesite (rol, sucursal asignada, nombre, correo).
4. Guarde.

### Desactivar un usuario

Si un empleado deja de trabajar en el negocio, es importante desactivar su cuenta para que no pueda ingresar. Haga clic en su nombre y seleccione **Eliminar** o **Desactivar**. Sus datos y el historial de ventas permanecen en el sistema; solo pierde el acceso.

---

## 21. Sucursales

Si su negocio tiene más de un local o punto de venta, puede gestionar cada uno por separado desde Stokity.

### ¿Cómo funcionan las sucursales en el sistema?

- **Cada usuario pertenece a una sucursal.** Un vendedor solo verá los productos, ventas y caja de su sucursal.
- **Los productos son por sucursal.** El mismo producto puede tener stock diferente en cada sucursal.
- **Las ventas son por sucursal.** El historial de ventas de una sucursal no se mezcla con otra.
- **El administrador ve todo.** Solo el administrador puede ver información de todas las sucursales al mismo tiempo o cambiar entre ellas.
- **Los reportes se pueden ver por sucursal** o como consolidado total del negocio.

### Cómo crear una sucursal

1. En la barra lateral *(solo administrador)*, haga clic en **Sucursales**.
2. Haga clic en **Nueva sucursal**.
3. Complete los datos:

| Campo | Descripción |
|-------|------------|
| **Nombre** | El nombre del local (ej: "Sede Norte", "Local Centro") |
| **Razón social** | Nombre legal si aplica |
| **Dirección** | Dirección física del local |
| **Teléfono** | Número del local |
| **Correo** | Email del local |

4. Guarde.

Luego asigne usuarios a esa sucursal al crearlos o editarlos.

---

## 22. Configuración del Sistema

La configuración permite personalizar Stokity según las necesidades del negocio.

### 22.1 Mi Perfil

Cada usuario puede actualizar su información personal.

**Cómo hacerlo:**
1. Haga clic en su nombre en la parte superior derecha.
2. Seleccione **Perfil** o **Configuración → Perfil**.
3. Cambie su nombre o correo electrónico.
4. Haga clic en **Guardar**.

### 22.2 Cambiar Contraseña

1. Vaya a **Configuración → Contraseña**.
2. Escriba su contraseña actual (por seguridad).
3. Escriba la nueva contraseña.
4. Confírmela escribiéndola de nuevo.
5. Haga clic en **Guardar**.

> **Recomendación:** Use una contraseña que combine letras, números y símbolos. Nunca la comparta con compañeros.

### 22.3 Datos del Negocio *(solo administrador)*

Esta es la información que aparece en los tiquetes y documentos del negocio.

1. Vaya a **Configuración → Datos del negocio**.
2. Complete o actualice:

| Campo | Para qué sirve |
|-------|---------------|
| **Nombre del negocio** | Aparece en el encabezado de todos los tiquetes |
| **NIT o RUT** | Identificación tributaria, aparece en tiquetes si se activa |
| **Teléfono** | Teléfono de contacto del negocio |
| **Correo electrónico** | Email del negocio |
| **Dirección** | Dirección del negocio, aparece en tiquetes si se activa |
| **Logo** | Imagen del logo. Aparece en los tiquetes impresos |
| **Símbolo de moneda** | El símbolo que aparece junto a los precios (ej: $) |
| **Sesión de caja obligatoria** | Si está activado, los vendedores no podrán vender sin abrir la caja primero |

3. Haga clic en **Guardar**.

### 22.4 Apariencia *(solo administrador)*

Personalice el aspecto visual del sistema.

1. Vaya a **Configuración → Apariencia**.
2. Configure:
   - **Imagen predeterminada de productos:** La imagen que se muestra cuando un producto no tiene foto asignada.
   - **Color principal:** El color de los encabezados y botones principales del sistema.
   - **Color secundario:** El color de acento para elementos secundarios.
3. Los cambios se aplican inmediatamente en todo el sistema.

### 22.5 Configuración del Tiquete *(solo administrador)*

Define exactamente cómo se verán los recibos que se imprimen al cliente.

1. Vaya a **Configuración → Tiquete**.
2. Configure las opciones:

| Opción | Descripción |
|--------|------------|
| **Ancho del papel** | 58mm (impresora pequeña portátil) o 80mm (impresora estándar de mostrador) |
| **Tamaño del encabezado** | Qué tan grande aparece el nombre del negocio en la parte superior |
| **Mostrar logo** | Si el logo aparece en el tiquete |
| **Mostrar NIT** | Si el NIT del negocio aparece |
| **Mostrar dirección** | Si la dirección del negocio aparece |
| **Mostrar teléfono** | Si el teléfono aparece |
| **Mostrar nombre del vendedor** | Si aparece quién atendió la venta |
| **Mostrar nombre de sucursal** | Si aparece el nombre del local |
| **Mostrar impuesto desglosado** | Si los impuestos aparecen como línea separada |
| **Líneas del pie de página** | Texto personalizado al final (ej: "¡Gracias por su compra!", "Garantía de 30 días") |
| **Código en el tiquete** | Sin código, código QR (para consulta digital de la venta) o código de barras |

3. A la derecha verá una **vista previa en tiempo real** del tiquete mientras configura. Los cambios se reflejan al instante para que vea exactamente cómo quedará impreso.
4. Más abajo hay una sección separada para configurar el **tiquete de devoluciones** con opciones similares.
5. Haga clic en **Guardar** cuando esté listo.

> **Consejo:** Si tiene impresora de 58mm, use texto corto en el encabezado. Si usa logo, asegúrese de que la imagen sea clara en blanco y negro ya que las impresoras térmicas no imprimen color.

### 22.6 Configuración de Impresora *(solo administrador)*

Aquí se configura la impresión automática de tiquetes mediante el programa QZ Tray.

**¿Qué es QZ Tray?**
QZ Tray es un pequeño programa gratuito que debe estar instalado en la computadora donde está conectada la impresora. Hace de "puente" entre el sistema web (Stokity) y la impresora física. Sin QZ Tray corriendo, no hay impresión automática.

**En esta pantalla puede:**

- **Ver el estado de la conexión:** Indica si QZ Tray está corriendo en el computador actual.
- **Conectar:** Si QZ Tray está corriendo pero no conectado, haga clic en **Conectar**.
- **Desconectar:** Si quiere dejar de imprimir temporalmente sin cerrar QZ Tray.
- **Seleccionar la impresora:** Si el computador tiene varias impresoras, elija cuál usar para los tiquetes.
- **Seleccionar el ancho del papel:** Confirme si es 58mm o 80mm (debe coincidir con el papel que tiene en la impresora).
- **Impresión automática (activar/desactivar):** 
  - **Activada:** Cada vez que se completa una venta, el tiquete se imprime solo sin hacer nada.
  - **Desactivada:** Las ventas no se envían a la impresora automáticamente. Útil cuando la impresora no está disponible temporalmente y no quiere que los trabajos de impresión se acumulen.
- **Descargar certificado de seguridad:** Descarga el archivo de seguridad que necesita instalar en QZ Tray cuando lo configura por primera vez en un computador nuevo.

---

## 23. Impresión de Recibos

Stokity puede imprimir varios tipos de documentos en impresoras térmicas.

### Tipos de recibos disponibles

| Tipo de recibo | Cuándo se imprime | Cómo imprimirlo |
|---------------|------------------|-----------------|
| **Recibo de venta** | Después de cada venta completada | Automáticamente si la impresión automática está activada, o manualmente desde el detalle de la venta |
| **Recibo de devolución** | Cuando se registra una devolución | Automáticamente o desde el detalle de la devolución |
| **Reporte de cierre de caja** | Al cerrar una sesión de caja | Desde el detalle de la sesión de caja |
| **Comprobante de crédito** | Al crear un crédito | Desde el detalle del crédito |
| **Comprobante de pago de crédito** | Al registrar un pago a un crédito | Desde el detalle del pago |

### Cómo imprimir manualmente

Si la impresión automática no está activada o desea reimprimir un documento:

1. Vaya al módulo correspondiente (Ventas, Créditos, etc.).
2. Abra el detalle del documento.
3. Busque el botón **Imprimir** o el ícono de impresora.
4. Haga clic y el documento se enviará a la impresora.

### Qué hacer si la impresora no funciona

Siga estos pasos en orden:

1. **Verifique que la impresora está encendida** y tiene papel.
2. **Verifique que está conectada** al computador (por USB o Bluetooth).
3. **Verifique que QZ Tray está corriendo** en el computador. Búsquelo en la barra de tareas (esquina inferior derecha en Windows, barra superior en Mac). Si no está, ábralo.
4. En Stokity, vaya a **Configuración → Impresora** y verifique el estado.
5. Si aparece como desconectado, haga clic en **Conectar**.
6. Si después de conectar sigue sin imprimir, intente apagar y encender la impresora.
7. Si el problema persiste, comuníquese con el administrador del sistema.

---

## 24. Roles y Permisos — Quién Puede Hacer Qué

Stokity tiene tres niveles de acceso. Según el rol asignado, cada empleado verá diferentes módulos y podrá realizar diferentes acciones.

### Vendedor

El rol para el personal de ventas diario.

**Tiene acceso a:**
- Punto de Venta (POS): Hacer ventas, guardar cotizaciones.
- Historial de ventas: Ver las ventas que él mismo ha hecho.
- Créditos: Ver, crear créditos y registrar pagos.
- Clientes: Ver, crear y editar clientes.
- Sesiones de caja: Abrir y cerrar su caja, registrar entradas y salidas de efectivo.
- Historial de caja: Ver las sesiones de caja de su sucursal.

**No tiene acceso a:**
- Catálogo de productos (no puede crear ni modificar productos).
- Movimientos de stock (no puede hacer entradas de mercancía).
- Finanzas ni reportes.
- Gastos.
- Usuarios, sucursales, métodos de pago ni configuración del sistema.

---

### Encargado (Manager)

Para jefes de local o encargados de tienda con más responsabilidades.

**Tiene todo lo del Vendedor, más acceso a:**
- Catálogo de productos: Crear, editar e inactivar productos.
- Categorías: Crear y gestionar categorías.
- Proveedores: Crear y gestionar proveedores.
- Movimientos de stock: Registrar entradas, salidas, ajustes y bajas de inventario.
- Reportes: Ver todos los reportes de su sucursal.
- Finanzas: Ver el estado de resultados de su sucursal.
- Gastos: Registrar y gestionar gastos.

**No tiene acceso a:**
- Usuarios (no puede crear ni eliminar empleados).
- Sucursales (no puede crear ni modificar sucursales).
- Métodos de pago (no puede agregarlos ni eliminarlos).
- Configuración del sistema (datos del negocio, tiquete, apariencia, impresora).

---

### Administrador

Acceso total al sistema. Generalmente el dueño o gerente del negocio.

**Tiene acceso a todo, incluyendo exclusivamente:**
- Gestión de usuarios (crear, editar, eliminar).
- Gestión de sucursales.
- Configuración de métodos de pago.
- Configuración general del sistema (datos del negocio, apariencia, tiquete, impresora).
- Reportes de todas las sucursales.
- Finanzas de todas las sucursales.

---

### Tabla de permisos

| Módulo | Vendedor | Encargado | Administrador |
|--------|----------|-----------|---------------|
| Punto de Venta (POS) | ✅ | ✅ | ✅ |
| Ventas — ver historial | ✅ | ✅ | ✅ |
| Devoluciones | ✅ | ✅ | ✅ |
| Créditos | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Sesiones de Caja | ✅ | ✅ | ✅ |
| Catálogo de Productos | ❌ | ✅ | ✅ |
| Categorías | ❌ | ✅ | ✅ |
| Proveedores | ❌ | ✅ | ✅ |
| Movimientos de Stock | ❌ | ✅ | ✅ |
| Finanzas | ❌ | ✅ (su sucursal) | ✅ (todas) |
| Gastos | ❌ | ✅ | ✅ |
| Reportes | ❌ | ✅ (su sucursal) | ✅ (todas) |
| Usuarios | ❌ | ❌ | ✅ |
| Sucursales | ❌ | ❌ | ✅ |
| Métodos de Pago | ❌ | ❌ | ✅ |
| Configuración del sistema | ❌ | ❌ | ✅ |

---

## 25. Preguntas Frecuentes

**¿Por qué no puedo hacer una venta?**

Las razones más comunes son:
1. **No hay sesión de caja abierta** y el negocio la requiere. Abra la caja primero.
2. **El producto no aparece** porque está inactivo o sin stock. Verifique con el encargado.
3. **Su usuario no tiene el rol correcto.** Comuníquese con el administrador.

---

**¿Por qué el stock de un producto no bajó después de venderlo?**

Si el producto es de tipo **Servicio**, el stock no cambia porque los servicios no tienen inventario. Si es un producto físico y el stock no bajó, comuníquese con su administrador.

---

**¿Por qué un producto que estaba disponible ya no aparece en el POS?**

Puede ser porque:
- El stock llegó a cero (se agotó).
- El producto fue marcado como inactivo.
- El stock disponible está en cero porque hay unidades reservadas en cotizaciones activas o separados/reservados.

---

**¿Cómo recupero un producto, categoría o sucursal que eliminé?**

Vaya al módulo correspondiente → busque el botón **Papelera** → encuentre el elemento eliminado → haga clic en **Restaurar**.

---

**¿Se pierden los datos si cierro el navegador o se va la luz?**

No. Stokity guarda todo en el servidor (en la nube). Puede cerrar el navegador, reiniciar el computador o incluso irse la luz. Al volver a ingresar, todo estará igual. Sin embargo, si estaba en medio de una venta en el POS y no la había guardado ni cobrado, el carrito se perderá. Las cotizaciones ya guardadas no se pierden.

---

**¿Puedo usar Stokity desde el celular o tableta?**

Sí. Stokity funciona desde el navegador de cualquier dispositivo (celular, tableta, computador). Para el Punto de Venta se recomienda una tableta o computador para mayor comodidad al buscar productos y manejar el carrito.

---

**Cerré la caja pero el monto no cuadra. ¿Qué hago?**

Escriba una nota explicando la diferencia (ej: "Se prestaron $20.000 de cambio a otra caja") y cierre normalmente. El administrador puede ver el historial de discrepancias en los reportes. Las diferencias pequeñas y ocasionales son normales; si son frecuentes o grandes, el administrador debe investigar.

---

**¿Cómo sé si un cliente tiene créditos vencidos antes de darle otro crédito?**

1. Vaya al módulo de **Clientes** y abra el perfil del cliente.
2. Verá si tiene créditos activos o vencidos.
3. También puede ir a **Créditos → Vencidos** y buscar el nombre del cliente.

---

**¿Qué pasa con el stock cuando cancelo un separado?**

Cuando cancela un crédito tipo "Separado" (layaway) o "Reservado", el stock que estaba reservado para ese cliente se libera automáticamente y vuelve a estar disponible para otros clientes.

---

**¿Cómo cambio el precio de un producto?**

1. Vaya a **Catálogo de Productos**.
2. Busque el producto y haga clic en el ícono de editar (lápiz).
3. Cambie el precio de venta.
4. Guarde.

El nuevo precio aplica a las ventas que se hagan a partir de ese momento. Las ventas pasadas no se ven afectadas.

---

**¿Puedo exportar la lista de ventas a Excel?**

Sí. Vaya a **Reportes → Detalle de Ventas**, configure el rango de fechas que necesita y haga clic en **Exportar Excel**.

---

**¿La impresora no imprime. ¿Qué hago?**

1. Verifique que la impresora está encendida y tiene papel.
2. Verifique que está conectada al computador.
3. Verifique que el programa **QZ Tray** está corriendo (búsquelo en la barra de tareas).
4. En Stokity, vaya a **Configuración → Impresora** y haga clic en **Conectar**.
5. Si sigue sin funcionar, reinicie la impresora y repita el paso 4.

---

**¿Puedo hacer una venta sin conectar al sistema (sin internet)?**

No. Stokity requiere conexión a internet para funcionar, ya que toda la información se guarda en el servidor. Si se cae el internet, no podrá registrar ventas hasta que se restablezca la conexión.

---

*Manual de Usuario — Stokity v2*
*Sistema de Punto de Venta y Gestión Empresarial*
