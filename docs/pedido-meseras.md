# Mesas y pedidos de salón para meseras

Implementación en `feature/pedido-meseras`, basada en `dev` (`f4f3bba`). Conserva React, el SDK de InsForge, PostgreSQL y el esquema de seguridad y permisos existente.

---

## 1. Comportamiento y Flujo Operativo

- **Consulta en tiempo real (SCRUM-277)**: La pantalla de salón consulta las dieciséis mesas persistidas en PostgreSQL y asocia cada mesa con su pedido de salón activo, calculando su consumo total, inicio de atención, número de comensales y estado de cuenta.
- **Apertura de pedido atómica (SCRUM-278 & SCRUM-282)**: La mesera abre un pedido mediante la función de servidor `abrir_pedido_mesera`. La función bloquea la mesa (`FOR UPDATE`), verifica que no existan pedidos activos para esa mesa e inserta el encabezado del pedido (`tipo='salon'`), actualizando de inmediato la mesa a `ocupada`.
- **Precios seguros del servidor (SCRUM-279)**: Al agregar productos a la comanda con `agregar_items_pedido_mesera`, los precios unitarios se toman directamente de la tabla `productos` con bloqueo compartido (`FOR SHARE`), evitando cualquier manipulación desde el cliente.
- **Recálculo automático de importes**: Gracias al trigger `recalcular_subtotal_pedido`, cualquier producto añadido o modificado en `detalles_pedido` actualiza de forma automática el `subtotal` y `total` del pedido en PostgreSQL sin cobrar envío (`envio = 0`).
- **Envío a cocina y auditoría (SCRUM-280)**: La función `enviar_pedido_cocina_mesera` cambia el estado del pedido a `preparacion`. Esto dispara el trigger `pedido_historial`, registrando en `historial_estados_pedido` el cambio de estado con el usuario y la marca de tiempo exacta.
- **Solicitud de cuenta a caja (SCRUM-281)**: El modal de detalle de mesa permite registrar la solicitud de cuenta marcando `cuenta_solicitada = true` en PostgreSQL, permitiendo a Caja identificar qué mesas requieren liquidación.
- **Liberación de mesa**: La función `liberar_mesa` concluye el pedido activo marcándolo como `entregado` y restablece la mesa al estado `libre`.
- **Desacoplamiento total de almacenamiento local (SCRUM-283)**: Se eliminaron todas las escrituras y lecturas a `lys_mesas` y `lys_pedidos` en los componentes y hooks de salón.

---

## 2. Contratos de Funciones y Servicios de InsForge

| Operación | Método / RPC de InsForge | Rol Permitido | Propósito |
|---|---|---|---|
| Consultar mesas | `insforge.database.from('mesas').select(...)` | Mesera, Caja, Admin | Listado de mesas y zonas |
| Consultar pedidos activos | `insforge.database.from('pedidos').select(...)` | Mesera, Cocina, Caja, Admin | Pedidos de salón activos |
| Abrir pedido | `POST /api/database/rpc/abrir_pedido_mesera` | Mesera, Admin | Ocupar mesa e iniciar pedido |
| Agregar ítems | `POST /api/database/rpc/agregar_items_pedido_mesera` | Mesera, Admin | Registrar productos y observaciones |
| Enviar a cocina | `POST /api/database/rpc/enviar_pedido_cocina_mesera` | Mesera, Admin | Cambiar estado a preparación |
| Solicitar cuenta | `POST /api/database/rpc/solicitar_cuenta_mesa` | Mesera, Admin | Notificar a caja |
| Liberar mesa | `POST /api/database/rpc/liberar_mesa` | Mesera, Admin | Finalizar pedido y liberar mesa |

---

## 3. Relación de Commits y Tareas Scrum (EPIC SCRUM-276)

Autor: **PelayoSotoJoanAmado <joanamadopelayosoto@gmail.com>**

| # | Mensaje del Commit | Tarea Scrum | Archivos Clave |
|---|---|---|---|
| 1 | `Crear migración para registrar pedidos de salón e impedir mesas duplicadas` | SCRUM-282 | `migrations/20261009010000_pedido-meseras.sql` |
| 2 | `Implementar función de servidor para abrir un pedido y ocupar su mesa` | SCRUM-278 | `migrations/20261009010000_pedido-meseras.sql` |
| 3 | `Implementar función de servidor para agregar productos y observaciones` | SCRUM-279 | `migrations/20261009010000_pedido-meseras.sql` |
| 4 | `Implementar funciones de servidor para enviar pedido a cocina y solicitar cuenta` | SCRUM-280, SCRUM-281 | `migrations/20261009010000_pedido-meseras.sql` |
| 5 | `Consultar el catálogo y estado de mesas directamente desde PostgreSQL` | SCRUM-277 | `src/services/mesaService.js` |
| 6 | `Actualizar useMesas para manejar carga asíncrona y sincronización con InsForge` | SCRUM-277, SCRUM-283 | `src/hooks/useMesas.js` |
| 7 | `Conectar la apertura de pedidos de salón con la función de servidor` | SCRUM-278 | `src/pages/NuevoPedidoPage.jsx` |
| 8 | `Permitir agregar productos y observaciones con precios verificados en servidor` | SCRUM-279 | `src/pages/NuevoPedidoPage.jsx` |
| 9 | `Registrar el envío del pedido a cocina desde la comanda de mesa` | SCRUM-280 | `src/pages/NuevoPedidoPage.jsx` |
| 10 | `Implementar el registro de solicitud de cuenta para caja en PostgreSQL` | SCRUM-281 | `src/components/mesas/MesaDetalleModal.jsx` |
| 11 | `Validar y bloquear la apertura de pedidos duplicados en una misma mesa` | SCRUM-282 | `src/services/mesaService.js` |
| 12 | `Eliminar el almacenamiento local lys_mesas y escrituras directas a lys_pedidos` | SCRUM-283 | `src/data/mesasData.js` |
| 13 | `Agregar pruebas de integridad, concurrencia y permisos RLS para meseras` | SCRUM-276 a 283 | `tests/mesas-pedidos.test.js` |
| 14 | `Documentar la arquitectura, migraciones y pruebas de la funcionalidad de meseras` | SCRUM-276 | `docs/pedido-meseras.md` |

---

## 4. Resultados de Validación Local

- **83 pruebas aprobadas en Vitest**:
  - 8 pruebas dedicadas de salón y meseras en `tests/mesas-pedidos.test.js` (concurrencia, bloqueo atómico de mesa, inserción de ítems, recálculo de importes, envío a cocina, auditoría de estados, solicitud de cuenta y RLS).
  - 75 pruebas preexistentes de catálogo, pedidos de cliente, autenticación y configuración pasando al 100%.
- **Compilación de producción exitosa**: `npm run build` genera la distribución Vite en 1.40s sin errores.
- **Restricción de unicidad verificada**: El índice `pedidos_mesa_activa_idx` y la comprobación transaccional impiden físicamente que se creen dos pedidos simultáneos para la misma mesa.
