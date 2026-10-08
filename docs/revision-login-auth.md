# Revisión de autenticación y configuración

Rama local: `feature/login-auth`, creada desde `dev` (`bc692f1`). No se ha hecho push ni se ha creado un pull request.

## Cambios

- SDK oficial de InsForge y cliente único para autenticación y pedidos. URL y clave anónima pública se leen del entorno; la clave administrativa no forma parte del frontend ni de Git.
- Cuatro migraciones PostgreSQL versionadas: tablas, datos iniciales, permisos y creación transaccional de pedidos con precios del servidor.
- Tablas de perfiles, roles, categorías, productos, mesas, estados, pedidos, detalles y pagos.
- Datos iniciales del repositorio: cuatro categorías, 17 productos y 16 mesas. Las mesas comienzan libres; no se importan pedidos ficticios del prototipo.
- Registro real, verificación de correo, inicio y cierre de sesión, restauración de sesión y edición de perfiles y preferencias.
- Perfil vinculado por ID al usuario de Auth. El rol predeterminado es Cliente; cambiarlo requiere administración de base de datos.
- Google mediante OAuth con PKCE gestionado por el SDK. Facebook se muestra únicamente si está habilitado; actualmente el proyecto solo anuncia Google y GitHub, por lo que Facebook permanece oculto.
- Recuperación con el correo de InsForge: código o enlace. El frontend ya no genera ni muestra códigos de demostración.
- Rutas restringidas para Cliente, Mesera, Cocina, Caja y Administrador.
- Historial y detalle de pedidos consultados por cuenta; la API aplica RLS incluso si se modifica la URL o se omite el filtro del frontend.
- Creación de pedidos mediante una función PostgreSQL que calcula los precios con el catálogo del servidor. El carrito solo se vacía después de confirmar la escritura.
- Eliminación de cuentas automáticas y credenciales del prototipo guardadas en el navegador.

## Estado de InsForge

El MCP se instaló para Codex y se llamó a `fetch-docs` con `instructions` y `auth-sdk`. Se consultó también la documentación oficial de base de datos y el código oficial de la API de configuración.

Las cuatro migraciones se aplicaron en el backend indicado por el usuario. Se verificaron las nueve tablas con RLS activo, 17 productos y 16 mesas. La clave pública puede consultar el catálogo y recibe denegación al consultar perfiles o pedidos.

Auth tiene verificación de correo y recuperación mediante código. Los retornos de desarrollo autorizados son:

- `http://localhost:5173/login`
- `http://localhost:5173/reset-password`
- `http://localhost:5173/auth/callback`

El script de configuración utiliza la API administrativa oficial y conserva los retornos existentes. No cambia requisitos de contraseña, proveedores ni configuración de correo.

## Validación

- Compilación de producción: correcta.
- Pruebas automatizadas de servicios y PostgreSQL: 18 correctas. Cubren acceso entre cuentas, elevación de privilegios, permisos por rol, recuperación, precios del servidor y reversión de pedidos inválidos.
- ESLint de los archivos de autenticación, pedidos y pruebas: correcto.
- ESLint global: conserva incidencias previas en componentes y hooks del prototipo, incluido el export de `useCart` en `CartContext.jsx`.
- Nueve escenarios Playwright preparados para registro/verificación, recuperación, proveedores, restauración y acceso por rol. No pudieron validarse en este entorno: la descarga estándar de Chromium falló y el ejecutable alternativo se cierra con SIGSEGV al abrir páginas. Ejecutarlos en un entorno con Chromium compatible antes de dar por validada la interfaz.
- Las pruebas no crean cuentas en InsForge ni envían correos reales. El flujo real de Google y la entrega de correos requieren una prueba manual con la cuenta del responsable.

## Límites del alcance

El repositorio no contiene el esquema MySQL original de LYS. El esquema PostgreSQL se construyó a partir de sus modelos y datos React; no se puede afirmar que sea una conversión exacta del esquema ausente. Falta compararlo con ese archivo cuando esté disponible.

La operación completa de mesas, cocina y caja conserva servicios de prototipo del repositorio. Sus rutas están protegidas y sus tablas tienen políticas por rol; la migración completa de esos flujos operativos corresponde a las funcionalidades posteriores a autenticación. Los pagos del checkout también conservan su simulación previa y no representan cobros bancarios reales.

Durante la verificación pendiente, nombre, apellido y teléfono se conservan temporalmente en `sessionStorage`, sin contraseña ni rol. Después de verificar en el mismo navegador se guardan en el perfil de PostgreSQL. Si se inicia sesión desde otro navegador antes de completar ese proceso, se debe completar el teléfono desde el perfil.

## Commits previstos

1. Configurar el cliente compartido de InsForge
2. Crear las tablas PostgreSQL de la pollería
3. Cargar categorías, productos y mesas iniciales
4. Proteger perfiles y operaciones con políticas por rol
5. Configurar retornos de desarrollo y ejecución de migraciones
6. Conectar registro, sesiones y perfiles con InsForge Auth
7. Recuperar contraseñas mediante el correo de InsForge
8. Integrar Google y detectar proveedores sociales disponibles
9. Restringir rutas para Cliente, Mesera, Cocina, Caja y Administrador
10. Vincular los pedidos a la cuenta del cliente
11. Verificar autenticación y permisos con pruebas automatizadas
12. Documentar la configuración y revisión de autenticación
