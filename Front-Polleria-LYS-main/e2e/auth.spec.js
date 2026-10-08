import { test, expect } from '@playwright/test';
const identity = { id: '00000000-0000-0000-0000-000000000001', email: 'cliente@example.test', emailVerified: true, profile: { name: 'Cliente' } };
async function mockBackend(page, role = null) {
  const profile = { id: identity.id, nombre: 'Cliente', apellido: 'Prueba', telefono: '987654321', rol: role || 'cliente', preferencias: {} };
  let signedIn = Boolean(role);
  const calls = [];
  const token = () => `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: identity.id, exp: Math.floor(Date.now()/1000) + 3600 }))}.signature`;
  const session = () => ({ user: identity, accessToken: token() });
  await page.route('https://mpy5z5dn.us-east.insforge.app/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    const body = req.postDataJSON(); calls.push({ path, body });
    let response = {}; let status = 200;
    if (path === '/api/auth/refresh') {
      if (signedIn) response = session();
      else { status = 401; response = { error: 'UNAUTHORIZED', message: 'No active session', statusCode: 401 }; }
    } else if (path === '/api/auth/public-config') response = { oAuthProviders: ['google'] };
    else if (path === '/api/auth/users') response = { requireEmailVerification: true, accessToken: null };
    else if (path === '/api/auth/email/verify' || path === '/api/auth/sessions' || path === '/api/auth/oauth/exchange') { signedIn = true; response = session(); }
    else if (path === '/api/auth/logout') signedIn = false;
    else if (path === '/api/database/records/perfiles') response = profile;
    else if (path === '/api/database/records/pedidos') response = [];
    else if (path === '/api/auth/email/exchange-reset-password-token') response = { token: 'real-email-token' };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response), headers: { 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Credentials': 'true' } });
  });
  return calls;
}
test('registra, verifica correo e inicia sesión sin cuentas de prueba', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/register');
  await page.getByLabel('Nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Apellido', { exact: true }).fill('Torres');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(identity.email);
  await page.getByLabel('Teléfono', { exact: true }).fill('987654321');
  await page.getByLabel('Contraseña', { exact: true }).fill('Secret123');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Secret123');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page).toHaveURL(/verify-email/);
  await page.getByLabel('Código de verificación', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verificar correo', exact: true }).click();
  await expect(page).toHaveURL(/profile/);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).not.toContain('lys_users');
});
test('muestra Google y oculta Facebook no configurado', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Facebook' })).toHaveCount(0);
});
test('recupera por correo sin mostrar un código de demostración', async ({ page }) => {
  const calls = await mockBackend(page);
  await page.goto('/forgot-password');
  await page.getByLabel('Correo electrónico').fill(identity.email);
  await page.getByRole('button', { name: 'Enviar código de recuperación' }).click();
  await expect(page.getByRole('status')).toContainText('recibirás las instrucciones');
  await expect(page.getByText('Código de verificación (demo)')).toHaveCount(0);
  await page.goto('/reset-password');
  await page.getByLabel('Correo electrónico').fill(identity.email);
  await page.getByLabel('Código de verificación').fill('123456');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NewSecret123');
  await page.getByLabel('Confirmar nueva contraseña').fill('NewSecret123');
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page.getByRole('status')).toContainText('actualizó correctamente');
  expect(calls.find(c => c.path === '/api/auth/email/reset-password').body.otp).toBe('real-email-token');
});
for (const [role, route, allowed] of [['cliente','/caja',false],['mesera','/mesas',true],['cocina','/cocina',true],['caja','/caja',true],['admin','/dashboard',true]]) {
  test(`restaura la sesión y aplica acceso para ${role}`, async ({ page }) => {
    await mockBackend(page, role);
    await page.goto(route);
    await expect(page).toHaveURL(allowed ? new RegExp(route+'$') : /profile$/);
  });
}
test('una persona sin sesión no abre pedidos por URL directa', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/pedidos/otra-cuenta');
  await expect(page).toHaveURL(/login$/);
});
