import { test, expect } from '@playwright/test';
const identity = { id: '00000000-0000-0000-0000-000000000031', email: 'caja@example.test', emailVerified: true, profile: { name: 'Caja' } };
const order = { id: '00000000-0000-0000-0000-000000000041', codigo: 'PED-01-CAJA', tipo: 'salon', estado_id: 'preparacion', estado_pago: 'pendiente', cuenta_solicitada: true, subtotal: '42.90', envio: '0', total: '42.90', creado_en: '2026-10-09T18:00:00Z', mesas: { numero: '01' }, entrega: {}, detalles_pedido: [{ producto_id: 1, cantidad: 1, precio_unitario: '42.90', nombre_producto: 'Pollo a la brasa entero' }], pagos: [] };
async function backend(page, { failFirst = false, reject = '', role = 'caja', readError = false, empty = false } = {}) {
  const calls = []; let paid = null, table = 'ocupada';
  await page.addInitScript(() => localStorage.setItem('lys_pedidos', JSON.stringify([{ id: 'LOCAL-IGNORADO', estado: 'pendiente', total: 1 }])));
  await page.route('https://mpy5z5dn.us-east.insforge.app/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    let response = {}, status = 200;
    if (path === '/api/auth/refresh') {
      const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: identity.id, exp: Math.floor(Date.now()/1000)+3600 }))}.signature`;
      response = { user: identity, accessToken: token };
    } else if (path === '/api/auth/public-config') response = { oAuthProviders: [] };
    else if (path === '/api/database/records/perfiles') response = { id: identity.id, nombre: 'Caja', apellido: 'Prueba', rol: role, preferencias: {} };
    else if (path === '/api/database/records/pedidos') {
      if (readError) { status = 503; response = { message: 'No se puede consultar caja' }; }
      else response = empty ? [] : [{ ...order, estado_pago: paid ? 'pagado' : 'pendiente', estado_id: paid ? 'entregado' : order.estado_id, pagos: paid ? [{ comprobante: paid }] : [] }];
    } else if (path.includes('/rpc/registrar_cobro')) {
      const body = req.postDataJSON(); calls.push(body);
      if (reject) { status = 400; response = { message: reject }; }
      else {
        paid ??= { id: order.id, codigo: order.codigo, mesa: '01', tipo: 'salon', cliente: 'Mesa 01', subtotal: 42.9, envio: 0, total: 42.9, estado: 'pagado', estadoPedido: 'entregado', createdAt: order.creado_en, pagadoAt: '2026-10-09T19:00:00Z', items: [{ id: 1, cantidad: 1, precio: 42.9, nombre: 'Pollo a la brasa entero' }], pago: { id: '00000000-0000-0000-0000-000000000051', metodo: body.p_metodo, monto: body.p_recibido, importe: 42.9, vuelto: body.p_metodo === 'efectivo' ? 7.1 : 0 } };
        table = 'libre';
        if (failFirst && calls.length === 1) { status = 503; response = { message: 'Respuesta interrumpida' }; }
        else { await new Promise(resolve => setTimeout(resolve, 250)); response = paid; }
      }
    } else if (path === '/api/database/records/mesas') response = [{ id: 1, numero: '01', capacidad: 4, forma: 'cuadrada', zona: 'salon_principal', estado: table }];
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
  return calls;
}
test('cobra efectivo con vuelto confirmado, persiste comprobante y omite pedidos locales', async ({ page }) => {
  const calls = await backend(page);
  await page.goto('/caja');
  await expect(page.getByText('LOCAL-IGNORADO')).toHaveCount(0);
  await expect(page.getByText('Cuenta solicitada', { exact: false })).toBeVisible();
  const button = page.getByRole('button', { name: 'Cobrar S/ 42.90' });
  await page.getByLabel('Monto recibido').fill('40'); await expect(button).toBeDisabled();
  await page.getByLabel('Monto recibido').fill('50'); await button.click();
  await expect(page.getByRole('button', { name: 'Confirmando cobro…' })).toBeDisabled();
  const ticket = page.getByRole('dialog');
  await expect(ticket).toContainText('¡Venta registrada!');
  await expect(ticket).toContainText('S/ 7.10');
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ p_metodo: 'efectivo', p_recibido: 50, p_total_esperado: 42.9 });
  expect(calls[0]).not.toHaveProperty('vuelto');
  await page.getByRole('button', { name: 'Nueva venta' }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Cobrados 1' }).click();
  await page.getByRole('button', { name: 'Ver comprobante' }).click();
  await expect(page.getByRole('dialog')).toContainText('S/ 7.10');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lys_pedidos'))[0].id)).toBe('LOCAL-IGNORADO');
});
test('reintenta con la misma clave después de perder la respuesta', async ({ page }) => {
  const calls = await backend(page, { failFirst: true });
  await page.goto('/caja');
  await page.getByLabel('Monto recibido').fill('50');
  await page.getByRole('button', { name: 'Cobrar S/ 42.90' }).click();
  await expect(page.getByRole('alert')).toContainText('Respuesta interrumpida');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Monto recibido')).toBeDisabled();
  await page.getByRole('button', { name: 'Reintentar el mismo cobro' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
});
for (const method of ['Yape', 'Plin', 'Tarjeta']) {
  test(`registra ${method} separado con importe exacto`, async ({ page }) => {
    const calls = await backend(page); await page.goto('/caja');
    await page.getByRole('button', { name: method, exact: true }).click();
    await page.getByRole('button', { name: 'Cobrar S/ 42.90' }).click();
    await expect(page.getByRole('dialog')).toContainText(method);
    expect(calls[0]).toMatchObject({ p_metodo: method.toLowerCase(), p_recibido: 42.9 });
  });
}
test('muestra errores del servidor sin confirmar la venta', async ({ page }) => {
  await backend(page, { reject: 'El total cambió; actualiza el pedido antes de cobrar' });
  await page.goto('/caja'); await page.getByLabel('Monto recibido').fill('50');
  await page.getByRole('button', { name: 'Cobrar S/ 42.90' }).click();
  await expect(page.getByRole('alert')).toContainText('El total cambió');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Actualizar y revisar el resultado' }).click();
  await expect(page.getByLabel('Monto recibido')).toBeEnabled();
});
test('muestra fallos de consulta sin habilitar cobros', async ({ page }) => {
  await backend(page, { readError: true }); await page.goto('/caja');
  await expect(page.getByRole('alert')).toContainText('No se puede consultar caja');
  await expect(page.getByRole('button', { name: /Cobrar S/ })).toHaveCount(0);
});
test('muestra caja vacía en móvil', async ({ page }) => {
  await backend(page, { empty: true }); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/caja'); await expect(page.getByText('No encontramos pedidos')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('el administrador ve el cobro persistido en el resumen de ventas', async ({ page }) => {
  await backend(page, { role: 'admin' }); await page.goto('/caja');
  await page.getByLabel('Monto recibido').fill('50');
  await page.getByRole('button', { name: 'Cobrar S/ 42.90' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.locator('.admin-summary-card').filter({ hasText: 'Ingresos totales' })).toContainText('42.90');
  await expect(page.locator('.admin-history-table')).toContainText('PED-01-CAJA');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lys_pedidos'))[0].id)).toBe('LOCAL-IGNORADO');
});
