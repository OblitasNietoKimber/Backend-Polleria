# Pedidos online del cliente

Implementación en `feature/pedido-cliente`, basada en `dev`. Conserva React, el SDK de InsForge, Auth, PostgreSQL y los roles existentes. No introduce Java, Spring Boot ni MySQL.

## Comportamiento

- El cliente confirma delivery o recojo usando una sola función transaccional.
- El servidor identifica al cliente mediante `auth.uid()`, consulta productos disponibles y guarda sus nombres y precios vendidos.
- Subtotal = suma de cantidad × precio unitario. Delivery cuesta S/ 6; recojo cuesta S/ 0. Total = subtotal + envío.
- El navegador envía productos, cantidades, tipo, contacto y método de pago solicitado. Los importes del navegador no se aceptan como fuente de verdad.
- Si cualquier producto o dato es inválido, se revierten encabezado, detalles e historial.
- El mismo código y la misma solicitud devuelven el pedido ya confirmado; otro cliente o una solicitud diferente no pueden reutilizar ese código. El código se conserva para reintentos, incluso después de recargar.
- Los pedidos confirmados se consultan en PostgreSQL. `lys-client-orders` deja de ser la fuente del cliente. El carrito puede seguir guardándose localmente.
- La confirmación permite abrir el detalle. La lista se pagina de veinte en veinte; el estado se consulta cada quince segundos con una respuesta pequeña y pausa cuando la pestaña está oculta.
- El detalle muestra importes confirmados y hasta cien registros de estado, con fecha. El botón de actualización vuelve a consultar pedido e historial.

## Validaciones y permisos

Nombre entre 2 y 120 caracteres; teléfono peruano de nueve dígitos que empieza por 9; dirección de delivery entre 5 y 250 caracteres; referencia hasta 500 caracteres. Entre 1 y 100 productos diferentes, con cantidades enteras de 1 a 100. No se permite confirmar salón mediante la función de cliente.

Las políticas de filas impiden consultar pedidos, detalles e historial de otra cuenta. El cliente no crea encabezados ni detalles directamente, no fija los importes y no inserta, modifica ni borra eventos del historial. Mesera y Administrador conservan sus permisos para pedidos de salón.

Cada pedido nuevo registra su estado inicial. Los cambios de `estado_id` registran estado anterior, nuevo estado, usuario y momento. Actualizar observaciones o importes no agrega estados repetidos. Los pedidos anteriores reciben una fotografía de su estado conocido al migrar; no se reconstruyen cambios antiguos desconocidos.

## Contratos de la API existente

Se utiliza el SDK y la API de InsForge, igual que en los módulos de usuarios y catálogo.

| Operación | Ruta de InsForge | Uso |
|---|---|---|
| Confirmar | `POST /api/database/rpc/crear_pedido_cliente` | Función transaccional autenticada |
| Mis pedidos | `GET /api/database/records/pedidos` | Filtrar `cliente_id`, ordenar y paginar |
| Detalle y estado | `GET /api/database/records/pedidos` | Filtrar por `codigo`; RLS protege al propietario |
| Historial de estados | `GET /api/database/records/historial_estados_pedido` | Filtrar `pedido_id`, ordenar por fecha e ID |

```js
await insforge.database.rpc('crear_pedido_cliente', {
  p_codigo: 'LS-' + crypto.randomUUID(),
  p_tipo: 'delivery',
  p_entrega: {
    name: 'Cliente', phone: '987654321',
    address: 'Av. Ejemplo 123', reference: '',
  },
  p_items: [{ producto_id: 1, cantidad: 2 }],
  p_metodo_pago: 'efectivo',
})
```

La respuesta es el UUID del pedido. El servicio vuelve a consultar el pedido guardado para obtener código, subtotal, envío y total definitivos. Si esa consulta falla, el carrito conserva la misma solicitud para el reintento. El servidor devuelve errores de validación y autorización; el SDK los presenta mediante el mensaje de error existente.

## Migraciones y entorno

Los archivos existentes `insforge/migrations/001` a `004` permanecen intactos. Las nuevas migraciones se gestionan mediante la CLI instalada, en `migrations/`:

1. `20261008230016_totales-pedido.sql`: importes, nombre vendido y actualización de subtotal al cambiar detalles.
2. `20261008230132_historial-estados.sql`: auditoría automática y lectura protegida.
3. `20261008230153_confirmar-pedido-cliente.sql`: permisos explícitos, validaciones e idempotencia de la confirmación.

La rama de InsForge `pedido-cliente` fue creada con `schema-only` desde `Backend-LYS`. Allí se aplicaron las tres migraciones. Se cargaron solo roles, estados y un producto sintético para la comprobación; no se copiaron datos de clientes. El proyecto principal sigue sin estas migraciones.

Para aplicar las nuevas migraciones en el backend elegido, después de revisar el destino:

```bash
npx -y @insforge/cli link --project-id ID_DEL_PROYECTO
npx -y @insforge/cli db migrations up --all
```

No volver a ejecutar las migraciones originales sobre una base ya configurada. En una instalación vacía, primero se necesita la base original de las EPIC 1 y 2; estas tres migraciones la amplían.

El frontend requiere `VITE_INSFORGE_URL` y `VITE_INSFORGE_ANON_KEY` del mismo backend. Reiniciar Vite después de cambiar el entorno. `.insforge/` y `.env.local` están excluidos de Git. No colocar claves administrativas en variables `VITE_`.

## Continuidad de las siguientes EPIC

- Se conservan tablas, nombres de estados, roles y el UUID devuelto por la función.
- Los futuros cambios de cantidad o retiro de productos de salón recalcularán los importes mediante el trigger existente en esta implementación.
- Cocina podrá cambiar `estado_id` usando los permisos existentes; el historial se registrará automáticamente. La validación del orden de transiciones y su API operativa corresponden a la EPIC de Cocina.
- Caja podrá usar `total` como importe del pedido. `metodo_pago_solicitado` no constituye un pago ni una autorización de tarjeta.
- Las pantallas de salón, cocina y caja todavía utilizan sus servicios locales. Este trabajo no integra esas pantallas con PostgreSQL.
- La pasarela de tarjeta continúa siendo una simulación del proyecto original. No se almacenan datos de tarjeta en el pedido ni se marca la compra como pagada.

## Validación realizada

- 75 pruebas unitarias y de PostgreSQL embebido (PGlite): cálculos, precios del servidor, snapshots del producto, rollback, reintentos, RLS entre clientes, auditoría, compatibilidad con salón y migración de pedidos anteriores, además de los módulos previos.
- Playwright levanta un servidor separado con una clave ficticia; no reutiliza las credenciales reales de `.env.local`.
- 20 pruebas Playwright con respuestas de InsForge interceptadas: autenticación, catálogo y pedidos; incluyen delivery, recojo, historial, reintento después de recargar y presentación móvil sin desbordamiento.
- Las tres migraciones se ejecutaron correctamente en la rama real de InsForge.
- La API real rechazó lectura anónima de pedidos e historial y confirmación anónima, con código `42501`.
- Los permisos reales no permiten al rol `authenticated` editar `subtotal` ni insertar eventos de historial.
- Build correcto y revisión de espacios/diffs. ESLint pasa en los archivos nuevos y modificados, salvo la regla de Fast Refresh que ya afecta a `CartContext.jsx` por exportar el hook junto al componente; se conserva el patrón existente.

No se ha ejecutado una compra autenticada de extremo a extremo contra InsForge con un cliente real verificado. La verificación de correo se mantiene: un intento de desactivarla en la rama fue rechazado por la revisión automática. Los escenarios de cliente están cubiertos por PGlite y el navegador con API simulada; la comprobación con cuenta real sigue siendo una validación manual antes de integrar.

No se ha realizado push, PR, merge ni aplicación de las migraciones al backend principal.
