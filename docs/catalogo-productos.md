# Catálogo de productos

Rama local: `feature/catalogo-productos`. Proyecto InsForge: **Backend-LYS**.

La base es `6e2bf74`, el último commit de `feature/login-auth` disponible al iniciar esta implementación. EPIC 1 todavía no está integrado en `dev`; esta base conserva su cliente compartido, sesiones, perfiles, migraciones y permisos. Los seis commits anteriores del catálogo se sustituyeron por los trece commits de esta propuesta. No se ha realizado push.

## Comportamiento

`/catalogo` consulta las tablas PostgreSQL `categorias` y `productos` mediante el cliente compartido de InsForge. Las tarjetas y el detalle muestran nombre, descripción, imagen, precio y disponibilidad. La búsqueda usa `ILIKE` en PostgreSQL, sin distinguir mayúsculas; los caracteres `%`, `_` y `\` escritos por el usuario se tratan literalmente. El filtro por categoría se combina con la búsqueda en cada petición.

Las consultas recorren lotes de cien filas ordenadas por ID para recuperar todos los resultados. La búsqueda espera 250 ms antes de consultar. Las respuestas de consultas anteriores se descartan cuando cambia la búsqueda, el filtro o el detalle.

Los parámetros `buscar`, `categoria` y `producto` permiten compartir la selección por URL. Por ejemplo: `/catalogo?categoria=pollos&buscar=pollo` o `/catalogo?producto=1`.

La pantalla distingue carga, error con reintento, resultados vacíos y detalle inexistente. Un error no se sustituye por productos estáticos. Los productos agotados no se pueden agregar. El carrito recupera sus productos por ID desde PostgreSQL al restaurarse y bloquea la confirmación si no termina de cargar, falla una consulta o un producto está retirado o agotado. La creación de pedidos conserva el servicio de EPIC 1, que valida los precios en el servidor.

## Servicios de escritura

`src/services/productService.js` exporta:

| Método | Uso |
|---|---|
| `getCategories()` | Categorías persistidas |
| `getProducts({ search, category })` | Lista; valores predeterminados: búsqueda vacía y `todos` |
| `getProduct(id)` | Detalle por ID; devuelve `null` si no existe |
| `createProduct(product)` | Crear como Administrador; PostgreSQL asigna el ID |
| `updateProduct(id, product)` | Editar el producto indicado como Administrador |

Las escrituras consultan la sesión real y el rol de `perfiles`, y PostgreSQL vuelve a aplicar RLS. Cliente, Mesera, Cocina, Caja y visitantes no tienen permiso para crear o editar productos. El rol contenido en metadata editable de Auth no autoriza una operación.

Ejemplo desde un módulo React que utilice una sesión de Administrador:

```js
import { createProduct, updateProduct } from './services/productService'

const fields = {
  name: 'Pollo familiar',
  desc: 'Pollo a la leña con acompañamientos',
  category: 'pollos',
  price: 49.9,
  image: 'https://example.com/pollo.png',
  available: true,
}
const created = await createProduct(fields)
await updateProduct(created.id, { ...fields, price: 52.9, available: false })
```

La edición recibe los campos completos, igual que la creación. Nombre, categoría y precio son obligatorios; disponibilidad vale `true` por defecto, descripción vacía e imagen `null`. Las imágenes deben ser URLs HTTP/HTTPS. Solo se envían los campos permitidos; un ID o rol añadido al objeto no se escribe. Un ID inválido se rechaza antes de consultar. Una edición de un producto inexistente devuelve un error, sin actualizar otras filas.

Esta entrega añade los servicios de creación y edición y verifica su autorización. No incluye una pantalla administrativa nueva. Reutiliza las migraciones PostgreSQL y la configuración general de EPIC 1; no modifica las migraciones ya versionadas ni la autenticación.

## Historial y relación con las tareas

Todos los commits contribuyen a la historia SCRUM-261. Los identificadores aparecen en esta tabla de seguimiento, fuera de los mensajes de commit.

| Orden | Mensaje del commit | Tarea |
|---|---|---|
| 1 | Consultar las categorías desde PostgreSQL | SCRUM-262 |
| 2 | Consultar los campos completos de los productos | SCRUM-262, SCRUM-263 |
| 3 | Consultar un producto por su identificador | SCRUM-263 |
| 4 | Mostrar las categorías persistidas en el catálogo | SCRUM-262 |
| 5 | Mostrar los productos persistidos en el catálogo | SCRUM-263 |
| 6 | Conectar el detalle del producto a PostgreSQL | SCRUM-263 |
| 7 | Buscar productos por nombre en PostgreSQL | SCRUM-264 |
| 8 | Filtrar los productos por categoría en PostgreSQL | SCRUM-264 |
| 9 | Mostrar estados de carga, error y catálogo vacío | SCRUM-261, SCRUM-263, SCRUM-264 |
| 10 | Implementar la creación de productos para el Administrador | SCRUM-265 |
| 11 | Implementar la edición de productos para el Administrador | SCRUM-265 |
| 12 | Verificar los permisos de escritura del catálogo | SCRUM-265 |
| 13 | Documentar el funcionamiento y las pruebas del catálogo | SCRUM-261 a SCRUM-265 |

## Verificación local

Desde `Front-Polleria-LYS-main`, instalar con `npm ci`. El archivo ignorado `.env.local` usa la URL de Backend-LYS y su clave anónima pública, como explica el README. La clave administrativa nunca debe aparecer en variables `VITE_` ni en Git.

```bash
npm run dev
npm test
npm run test:e2e
npm run build
npm run lint
```

Resultados de esta entrega:

- **47 pruebas de Vitest aprobadas**, incluidas las de autenticación y pedidos existentes, consultas del catálogo, validación de escrituras y permisos PostgreSQL.
- **16 pruebas Playwright aprobadas**: nueve existentes de autenticación y siete del catálogo, búsqueda, filtro, detalle, carrito, productos agotados, carga, error, reintento y resultados vacíos. Se ejecutaron con Microsoft Edge mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- **Compilación de producción aprobada**, con avisos sobre tamaño del paquete y externalización de `crypto` del SDK.
- **Lint global: diez errores y una advertencia preexistentes**, el mismo resultado comprobado sobre la base `6e2bf74`. No se añade una regla de exclusión para ocultarlos.

Playwright intercepta las respuestas de InsForge. Las pruebas de permisos aplican las migraciones versionadas a PostgreSQL local en memoria con PGlite y prueban operaciones bajo roles reales de base de datos, incluidas escrituras directas que omiten React. No crean cuentas ni productos en Backend-LYS. Estos resultados no sustituyen la revisión manual del entorno real.

Para revisar manualmente: abrir `/catalogo`, combinar una búsqueda y categoría, abrir un detalle, agregar un producto disponible y recargar para comprobar el carrito. Verificar también un producto agotado y una búsqueda sin resultados. Revisar los servicios de escritura con cuentas reales cuyo rol esté asignado en `perfiles`; la cuenta de Administrador debe ser provisionada por el administrador del backend, sin cuentas de prueba automáticas.

El historial local puede revisarse desde la raíz del repositorio:

```bash
git log --reverse --oneline 6e2bf74..feature/catalogo-productos
git diff 6e2bf74..feature/catalogo-productos
```
