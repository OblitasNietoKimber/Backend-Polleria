# Backend de Pollería Leñas y Sabores

Frontend React/Vite con InsForge Auth y PostgreSQL. La aplicación está en `Front-Polleria-LYS-main`.

## Desarrollo

```bash
cd Front-Polleria-LYS-main
npm ci
cp .env.example .env.local
```

Completar `VITE_INSFORGE_ANON_KEY` con la clave anónima pública del proyecto. Obtenerla desde InsForge: Install → API Keys, o con el MCP `get-anon-key`. Nunca usar la API key administrativa en una variable `VITE_`.

El archivo `.env.local` se crea dentro de `Front-Polleria-LYS-main`, junto a `package.json`. No se descarga desde GitHub porque está excluido de Git. Después de crearlo o cambiar sus valores, reiniciar `npm run dev`. Si falta la configuración o es inválida, la aplicación muestra las instrucciones necesarias en pantalla.

```bash
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas Playwright interceptan las respuestas de InsForge; no crean usuarios reales ni envían correos. Antes de publicar, probar también el proveedor Google y la entrega real de verificación/recuperación.

## Migraciones y retornos de Auth

Desde la raíz, definir `INSFORGE_URL` y `INSFORGE_API_KEY` en el entorno del administrador. La clave debe mantenerse fuera de Git. Los scripts no cargan archivos `.env` automáticamente.

```bash
node insforge/migrate.mjs
node insforge/configure-auth.mjs
```

El ejecutor registra cada migración y su SHA-256 en un esquema privado. Una migración aplicada no se edita; se agrega otra. Cada migración se ejecuta en un bloque PostgreSQL atómico compatible con la API de InsForge.

`configure-auth.mjs` agrega los retornos `/login`, `/reset-password` y `/auth/callback`. Usa `http://localhost:5173` como origen; definir `FRONTEND_URL` para otro entorno. El puerto debe coincidir con la URL autorizada.

## Roles

Cada cuenta registrada comienza como `cliente`. Los roles posibles son `cliente`, `mesera`, `cocina`, `caja` y `admin`. El usuario no puede modificar su rol desde formularios, metadata de Auth ni la API pública.

Para asignar roles de personal, un administrador de base de datos debe actualizar `public.perfiles.rol` con el ID confirmado del usuario. No hay cuentas de prueba ni contraseñas predeterminadas.

Ver [la revisión completa](docs/revision-login-auth.md) para el estado de validación, el alcance y las limitaciones.

El catálogo conectado a PostgreSQL y sus trece commits se describen en [la revisión del catálogo](docs/catalogo-productos.md), con servicios de creación y edición, permisos y pruebas locales.
