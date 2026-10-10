# Caja y pagos

La rama `feature/caja-pagos` parte de `dev` en `1cea74c`. Se revisaron las ramas `feature/login-auth`, `feature/catalogo-productos`, `feature/pedido-cliente` y `feature/pedido-meseras`; sus extremos están incorporados en `dev`, sin commits pendientes de integrar. Se conservan React/Vite, el SDK de InsForge, los roles protegidos en PostgreSQL, el cálculo de importes, el historial de estados y las funciones de salón existentes.

## Configuración y revisión de InsForge

Se ejecutó el instalador solicitado. Su invocación de Codex falló por el tratamiento de la ruta de Windows; se registró la misma conexión mediante `codex mcp add`. Se llamó al MCP real con `fetch-docs` para `instructions` y `fetch-sdk-docs` para base de datos en TypeScript. También se consultaron los esquemas reales de `pedidos` y `pagos`, que tienen las migraciones anteriores y las políticas RLS esperadas.

La configuración pública del frontend está en `Front-Polleria-LYS-main/.env.local`. La clave administrativa queda en la configuración local del MCP. Ninguna credencial, respuesta local del MCP ni archivo de entorno se incluye en los commits. Los resultados de Playwright también están excluidos.

**Las nuevas migraciones de caja todavía no se han aplicado al backend real. No se ha hecho push, PR ni merge.** El código y sus migraciones están preparados para revisión local; se necesita aplicar las migraciones antes de ejecutar Caja contra el backend real.

## Requisitos de la imagen

| Requisito | Comportamiento implementado |
|---|---|
| Consultar pedidos pendientes de pago | Consulta PostgreSQL con roles Caja/Administrador. Hay un servicio específico de pendientes que excluye cancelados y cuentas vacías; la pantalla separa pendientes y cobrados, busca por código, cliente y mesa, y actualiza periódicamente. |
| Registrar cobro y actualizar pedido | `registrar_cobro` inserta un pago y marca `estado_pago='pagado'` dentro de una sola transacción. |
| Calcular vuelto en servidor | Usa `numeric`, el total persistido y el monto recibido; valida céntimos, valores finitos y dinero suficiente. La pantalla distingue la estimación del comprobante confirmado. |
| Impedir cobros duplicados | Bloqueo del pedido, unicidad por pedido y clave de idempotencia. Repetir exactamente la misma solicitud devuelve el mismo comprobante; una solicitud distinta sobre el pedido pagado falla. |
| Liberar mesa después de confirmar pago | Para salón, el servidor marca `entregado`, registra historial, limpia la solicitud de cuenta y libera la mesa. La ruta anterior y las escrituras directas no permiten cerrar una cuenta sin pago. |
| Devolver datos del comprobante | Guarda una fotografía de código, cliente, mesa/tipo, productos vendidos, subtotal, envío, total, fecha, operación, cajero, método, recibido y vuelto. Se puede volver a consultar tras recargar. |
| Sustituir el cobro local | Caja y el resumen del administrador consultan InsForge. Se eliminaron las lecturas y escrituras de `lys_pedidos` y `lys_mesas` del flujo de caja; la comanda del modal de mesa usa los datos de PostgreSQL. |

Los métodos son Efectivo, Yape, Plin y Tarjeta. Es un registro presencial confirmado por el personal de caja; no realiza una autorización bancaria ni procesa una tarjeta. Delivery y recojo pueden cobrarse sin cambiar su estado operativo. El pago de salón concluye la atención. Los productos e importes de una cuenta cobrada quedan protegidos contra modificaciones posteriores.

La pantalla bloquea los controles mientras confirma. Si falla la respuesta, conserva en memoria la misma solicitud para reintentar; también permite actualizar y revisar el resultado en el servidor. Después de una recarga, un pago ya confirmado aparece en Cobrados y su comprobante se consulta desde PostgreSQL.

## Contrato del cobro

```js
await insforge.database.rpc('registrar_cobro', {
  p_pedido_id: pedido.id,
  p_metodo: 'efectivo',
  p_recibido: 50,
  p_idempotencia: crypto.randomUUID(),
  p_total_esperado: 42.90,
  p_referencia: null,
});
```

`p_total_esperado` sirve para detectar una cuenta que cambió después de mostrarse; no reemplaza el total de PostgreSQL. Para S/ 42.90 recibidos con S/ 50, el servidor registra S/ 42.90 y devuelve S/ 7.10. Los métodos digitales exigen el importe exacto. La clave se conserva durante un reintento y no se reutiliza para otra venta. El usuario y la fecha se obtienen en el servidor. Solo Caja y Administrador pueden ejecutar la función; el navegador no tiene permiso para insertar pagos directamente.

## Migraciones pendientes

Aplicar en el destino seleccionado, en este orden:

1. `20261010005900_validar-cuentas-anteriores.sql`: detiene la instalación ante pagos múltiples, pagos incompatibles con el total/estado o mesas anteriores cerradas sin pago. No elimina ni corrige automáticamente esas cuentas.
2. `20261010010000_caja-pagos.sql`: estado de pago, importes, claves únicas, comprobantes, permisos y función transaccional de cobro.
3. `20261010010100_proteger-cierre-cuenta.sql`: protección de productos, importes, cierre de pedidos y liberación de mesas.

Se mantiene el flujo de migraciones de la CLI documentado en `docs/pedidos-cliente.md`. No volver a aplicar las migraciones originales sobre el backend configurado. Una instalación con incidencias históricas debe conciliar sus cuentas antes de continuar. Los pagos anteriores válidos se reconocen como pagados; como el esquema anterior no guardaba el efectivo recibido ni el vuelto, su migración representa el importe registrado como recibido exacto, sin reconstruir movimientos desconocidos. El comprobante completo e inmutable se genera para los nuevos cobros.

## Commits locales

El historial se reorganizó en los 18 commits aprobados. La rama `backup/caja-pagos-original-8-commits` conserva los ocho commits originales. El contenido final del código y de las migraciones se mantiene igual; cambia su distribución en el historial. Las migraciones completas deben aplicarse juntas desde el extremo revisado de la rama.

| # | Commit | Descripción |
|---|---|---|
| 1 | `2c8d46f` | Excluir los resultados locales de las pruebas |
| 2 | `3e2bb8c` | Validar las cuentas anteriores a caja |
| 3 | `b074e2f` | Preparar el esquema de pagos |
| 4 | `415d3ab` | Registrar el cobro en el servidor |
| 5 | `cdd935f` | Proteger los productos de pedidos cobrados |
| 6 | `ab9a666` | Exigir pago para cerrar pedidos de salón |
| 7 | `c537602` | Impedir liberar mesas pendientes de pago |
| 8 | `449740f` | Consultar pedidos y ventas desde InsForge |
| 9 | `7dc3bab` | Conectar el servicio de cobro con InsForge |
| 10 | `6a809d3` | Separar los métodos de pago |
| 11 | `5b381f2` | Adaptar la lista y el detalle de pedidos |
| 12 | `aaeeab6` | Integrar el cobro persistido en Caja |
| 13 | `f971c9c` | Mostrar y recuperar los comprobantes |
| 14 | `4600e6c` | Usar pagos persistidos en el resumen de ventas |
| 15 | `453b379` | Mostrar la comanda real de cada mesa |
| 16 | `f30f3f7` | Reservar el cierre de mesas para Caja |
| 17 | `d1a7213` | Verificar el flujo completo de caja |
| 18 | Consultar con `git log` | Documentar la configuración de caja y pagos |

El último commit documenta la configuración y estas verificaciones. Su hash se consulta con `git log`, porque un commit no puede incluir su propio hash en su contenido. Todos los mensajes son descripciones sin prefijos ni referencias de gestión de tareas.

## Validación y límites

- **121 pruebas Vitest aprobadas:** incluyen las pruebas anteriores y cobros, validaciones de importes, permisos, rollback, reintentos, comprobantes, cuentas cobradas y seguridad de la migración histórica en PostgreSQL embebido.
- **29 pruebas Playwright aprobadas:** incluyen autenticación, catálogo, pedidos y nueve casos de caja/ventas con API interceptada: efectivo, métodos separados, error, respuesta perdida, recarga del comprobante, móvil y resumen administrativo.
- **Build correcto.** Conserva las advertencias de tamaño del paquete y del módulo `crypto` del SDK.
- **ESLint correcto en todos los archivos nuevos y modificados.** El análisis global mantiene nueve errores en `MascotCarousel`, `MesasNavLateral`, `OrderDeliveryInfo`, `CartContext`, `usePedidosCocina`, `useTiempoTranscurrido` y `cocinaService`; sus contenidos son los mismos de `dev`.
- **Revisión de diferencias sin errores de espacios.** El flujo de caja ya no usa almacenamiento local como fuente de pagos.

PGlite comprueba las funciones y restricciones de PostgreSQL, pero no equivale a una prueba entre varias conexiones concurrentes de un servidor real. Playwright usa respuestas simuladas y credenciales ficticias. Quedan pendientes la aplicación de estas tres migraciones y la prueba autenticada de un cobro contra el backend real. Cocina y reservas conservan el alcance previo de sus módulos; esta rama integra el cobro y el cierre de la atención de mesa.
