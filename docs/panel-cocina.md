# Panel de cocina y seguimiento

Rama `feature/panel-cocina`, creada desde `dev` en `1cea74c`. Se revisaron las ramas de autenticación, catálogo, pedidos del cliente y pedidos de meseras, integradas en esa base. Se conserva el SDK de InsForge, el esquema de roles, los importes calculados en servidor y el historial de estados existente.

## Comportamiento

- Cocina consulta los pedidos activos, productos vendidos, cantidades, observaciones y número de mesa desde PostgreSQL. Las comandas sin productos se excluyen. Se recorren páginas de cien registros para no ocultar pedidos por el límite de PostgREST.
- Nuevo corresponde a `recibido`; En preparación, a `preparacion`; Listo, a `listo`. La RPC `cambiar_estado_cocina` valida rol, bloquea la fila y compara el estado observado antes de actualizar. Un pedido cambiado en otra pantalla se rechaza y el panel vuelve a consultarlo.
- El trigger de validación impide saltos, retrocesos y preparación de pedidos vacíos, también ante escrituras directas de la API. Cocina no tiene política de actualización directa del encabezado; utiliza la RPC.
- Se reutiliza `historial_estados_pedido`: cada transición guarda usuario y hora del servidor en la misma transacción. La tarjeta muestra la última actualización. Preparación y entrega no se simulan en el navegador.
- Salón y recojo pueden pasar de Listo a Entregado desde cocina. Delivery queda Listo para reparto; el flujo de reparto debe avanzar a En camino y Entregado. Se conserva la liberación de mesas ya implementada por meseras.
- Se conserva que meseras pueda iniciar preparación, como en las pruebas y permisos previos. El envío de comanda de salón ya pasa a preparación en el servidor; por eso esos pedidos aparecen directamente en Preparando.
- Los filtros usan `recojo`, el valor real de PostgreSQL. El historial tiene paginación de cincuenta pedidos y conserva las secciones Hoy y Últimos 30 días en cada página.

## Sincronización y permisos

Los triggers de `pedidos` y `detalles_pedido` publican `lys:pedido-actualizado` con el UUID del pedido, sin productos, observaciones ni datos de contacto. Los clientes siempre vuelven a consultar PostgreSQL con RLS; el evento no es una fuente de datos ni permite alterar el estado.

| Canal | Acceso |
| --- | --- |
| `lys:staff` | Cocina, mesera, caja y administrador |
| `lys:client:<UUID del usuario>` | Solo ese cliente autenticado |

Las tablas de Realtime tienen RLS habilitado. No se concede una política INSERT para publicar eventos desde el navegador. Se comprobó en el backend seleccionado que `realtime.publish` solo tiene EXECUTE para `postgres` y `project_admin`.

Los componentes comparten una suscripción por canal. Al desmontarse el último consumidor, se libera. Las consultas se serializan y recuperan cambios recibidos durante una carga. Hay recarga al reconectar, recuperar red o enfocar la página, y consultas periódicas de respaldo: cinco segundos en cocina, diez segundos en mesas y seguimiento. La pestaña oculta suspende las consultas periódicas. El detalle del cliente actualiza pedido e historial; el detalle abierto de mesa usa la versión actual de la lista.

Se eliminó la sincronización de cocina mediante `lys_pedidos`, eventos `storage` y `lys_pedidos_updated`. Caja y el dashboard administrativo conservan sus servicios anteriores: su migración completa es un trabajo aparte; no se escriben pedidos de cocina en su almacenamiento local.

## Configuración general

El MCP de InsForge quedó registrado en la configuración global de Codex usando la CLI disponible. El instalador solicitado falló porque intentaba invocar un `codex.cmd` inexistente. Se llamó realmente a `fetch-docs` con `instructions`, `db-sdk` y `real-time` mediante un cliente MCP temporal.

`Front-Polleria-LYS-main/.env.local` está configurado con la URL del proyecto y su clave anónima pública. Está excluido de Git. La credencial administrativa solo pertenece al entorno de infraestructura; no se agrega a código ni variables `VITE_`. Los roles de personal se asignan administrativamente en `perfiles`, sin nuevas cuentas ni contraseñas de prueba.

## Migraciones aplicadas

1. `20261010010000_panel-cocina.sql`: validación, RPC, permisos e índice de consulta.
2. `20261010010100_seguimiento-tiempo-real.sql`: canales privados, RLS y triggers de publicación.

No se editó ninguna migración aplicada previamente. Las dos migraciones se aplicaron en el backend seleccionado después de recibir autorización explícita del usuario. Ambas quedaron registradas con su SHA-256; una segunda ejecución confirmó que se omiten sin volver a aplicar cambios.

Se verificaron en el servidor la RPC, los tres triggers, los canales habilitados y las políticas de acceso. RLS está activo en las tablas de Realtime. La API real respondió 401 con código 42501 a una llamada anónima de la RPC, sin modificar pedidos.

Para ejecutar estas migraciones en otro entorno autorizado, desde la raíz y con `INSFORGE_URL` e `INSFORGE_API_KEY` en el entorno administrativo:

```bash
node insforge/migrate.mjs --application --from 20261010010000
```

El ejecutor admite `--application` para `migrations/` y `--from` para comenzar en una migración nueva. El comando evita volver a aplicar las migraciones anteriores gestionadas por la CLI. Registra nombre y SHA-256, usa un bloqueo transaccional y rechaza modificaciones de una migración ya registrada. Sin opciones conserva la ejecución de las migraciones base de `insforge/migrations/`.

En instalaciones sin las funciones nativas de Realtime, su configuración se omite y las consultas periódicas siguen operando. En el backend seleccionado se verificaron `realtime.publish`, `realtime.channel_name` y las tablas necesarias.

## Validación

- 116 pruebas Vitest aprobadas: incluye permisos y RLS, transiciones inválidas y nulas, usuario sin perfil, conflicto entre dos pantallas, auditoría, privacidad de canales, servicio de cocina, paginación, recuperación de conexión y ejecutor de migraciones. PGlite ejecuta las migraciones y políticas de PostgreSQL, con un esquema de Realtime simulado para comprobar sus contratos.
- 26 pruebas Playwright aprobadas: incluye cocina y seguimiento en dos sesiones con WebSocket simulado, errores de concurrencia, delivery, filtro de recojo, historial móvil y recuperación sin WebSocket. Las pruebas interceptan InsForge y no crean usuarios ni pedidos reales.
- Compilación de producción aprobada y lint de todos los archivos modificados aprobado. El lint global conserva problemas anteriores en archivos ajenos a esta implementación.
- Las migraciones se validaron antes de aplicarse y después se comprobó su registro, las funciones, los triggers y los permisos en el backend real. La prueba del flujo con sesiones reales requiere iniciar sesión con cuentas de cocina y cliente existentes; no se crearon cuentas de prueba en el servidor.

## Commits locales

1. Permitir a cocina consultar las mesas
2. Validar las transiciones de estado en PostgreSQL
3. Actualizar estados de cocina con control de concurrencia
4. Configurar canales privados para personal y clientes
5. Publicar cambios de pedidos desde PostgreSQL
6. Compartir suscripciones y recuperar la conexión
7. Serializar consultas y descartar respuestas obsoletas
8. Consultar el estado de cocina desde las mesas
9. Actualizar automáticamente las mesas y su detalle
10. Conectar los pedidos y las acciones de cocina con InsForge
11. Mostrar errores y bloquear acciones durante la actualización
12. Corregir el filtro de pedidos para recojo
13. Consultar el historial de cocina con paginación
14. Actualizar automáticamente la lista de pedidos del cliente
15. Sincronizar el estado y el historial del cliente
16. Permitir aplicar migraciones desde una versión específica
17. Documentar la configuración y validación de cocina

La reorganización conserva la funcionalidad anterior. Los 17 commits se verificaron por separado con compilación y pruebas unitarias. Las pruebas de navegador de cocina se incorporaron junto a cada comportamiento y se ejecutaron en los pasos correspondientes.

El usuario autorizó la publicación de la rama y la aplicación de las migraciones después de revisar los 17 commits. Se mantiene un respaldo local de los seis commits anteriores en `backup/panel-cocina-before-17-commits`.
