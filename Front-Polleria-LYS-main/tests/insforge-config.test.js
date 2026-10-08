import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const createClient = vi.hoisted(() => vi.fn());
vi.mock('@insforge/sdk', () => ({ createClient }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ loading: false, error: '' }) }));
beforeEach(() => {
  vi.resetModules(); createClient.mockReset();
  vi.stubEnv('VITE_INSFORGE_URL', 'https://project.insforge.app');
  vi.stubEnv('VITE_INSFORGE_ANON_KEY', 'public-anonymous-token');
});
afterEach(() => vi.unstubAllEnvs());
test('la falta de variables no interrumpe los imports ni el arranque', async () => {
  vi.stubEnv('VITE_INSFORGE_ANON_KEY', '');
  const config = await import('../src/lib/insforge');
  const service = await import('../src/services/authService');
  await service.initializeAuth();
  expect(config.insforge).toBeNull();
  expect(createClient).not.toHaveBeenCalled();
  expect(service.getSnapshot()).toMatchObject({ loading: false, error: config.configurationError });
  const { default: AuthBoundary } = await import('../src/components/common/AuthBoundary.jsx');
  const html = renderToStaticMarkup(createElement(AuthBoundary, null, 'Contenido privado'));
  expect(html).toContain('Configura la conexión con InsForge');
  expect(html).toContain('.env.local');
  expect(html).not.toContain('Contenido privado');
});
test('rechaza claves administrativas sin detener React', async () => {
  vi.stubEnv('VITE_INSFORGE_ANON_KEY', 'ik_private-key');
  const config = await import('../src/lib/insforge');
  expect(config.configurationError).toContain('clave anónima pública');
  expect(createClient).not.toHaveBeenCalled();
});
test('una URL mal formada se convierte en un mensaje de configuración', async () => {
  vi.stubEnv('VITE_INSFORGE_URL', 'no-es-una-url');
  const config = await import('../src/lib/insforge');
  expect(config.configurationError).toContain('Revisa la URL');
  expect(createClient).not.toHaveBeenCalled();
});
test('una configuración válida crea el cliente y muestra la aplicación', async () => {
  const client = { auth: {} }; createClient.mockReturnValue(client);
  const config = await import('../src/lib/insforge');
  expect(config.insforge).toBe(client);
  expect(config.configurationError).toBe('');
  const { default: AuthBoundary } = await import('../src/components/common/AuthBoundary.jsx');
  expect(renderToStaticMarkup(createElement(AuthBoundary, null, 'Aplicación lista'))).toBe('Aplicación lista');
});
