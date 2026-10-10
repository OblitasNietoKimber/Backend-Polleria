import { beforeAll, beforeEach, afterAll, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

const db = new PGlite();
const caja = '00000000-0000-0000-0000-000000000031';
const mesera = '00000000-0000-0000-0000-000000000032';
const cliente = '00000000-0000-0000-0000-000000000033';
const admin = '00000000-0000-0000-0000-000000000034';
const token = '00000000-0000-0000-0000-000000000099';
async function asUser(user, sql, params = []) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('SET ROLE authenticated');
  try { return await db.query(sql, params); } finally { await db.exec('RESET ROLE'); }
}
async function pedido(codigo = 'PED-caja-001') {
  const id = (await asUser(mesera, "SELECT abrir_pedido_mesera(1,$1,2,'') AS id", [codigo])).rows[0].id;
  await asUser(mesera, 'SELECT agregar_items_pedido_mesera($1,$2)', [id, JSON.stringify([{ producto_id: 1, cantidad: 1 }])]);
  await asUser(mesera, 'SELECT solicitar_cuenta_mesa($1)', [id]);
  return id;
}
async function cobrar(id, { user = caja, metodo = 'efectivo', recibido = 50, clave = token, total = 42.9, referencia = null } = {}) {
  return (await asUser(user, 'SELECT registrar_cobro($1,$2,$3,$4,$5,$6) AS recibo', [id, metodo, recibido, clave, total, referencia])).rows[0].recibo;
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;`);
  for (const directory of ['../../insforge/migrations/', '../../migrations/']) {
    const root = new URL(directory, import.meta.url);
    for (const name of (await readdir(root)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, root), 'utf8'));
  }
  await db.query('INSERT INTO auth.users VALUES ($1),($2),($3),($4)', [caja, mesera, cliente, admin]);
  await db.query("INSERT INTO perfiles(id,rol) VALUES ($1,'caja'),($2,'mesera'),($3,'cliente'),($4,'admin')", [caja, mesera, cliente, admin]);
}, 30000);
beforeEach(async () => {
  await db.exec("TRUNCATE pedidos CASCADE; UPDATE mesas SET estado='libre'");
});
afterAll(() => db.close());

test('cobra el total persistido, calcula vuelto, audita y libera la mesa en una operación', async () => {
  const id = await pedido();
  const recibo = await cobrar(id);
  expect(recibo).toMatchObject({ id, codigo: 'PED-caja-001', mesa: '01', total: 42.9, estado: 'pagado', pago: { metodo: 'efectivo', monto: 50, importe: 42.9, vuelto: 7.1, registradoPor: caja } });
  expect(recibo.items[0]).toMatchObject({ nombre: 'Pollo a la brasa entero', precio: 42.9, cantidad: 1 });
  expect((await db.query('SELECT estado_pago,estado_id,cuenta_solicitada FROM pedidos WHERE id=$1', [id])).rows[0]).toEqual({ estado_pago: 'pagado', estado_id: 'entregado', cuenta_solicitada: false });
  expect((await db.query('SELECT estado FROM mesas WHERE id=1')).rows[0].estado).toBe('libre');
  expect((await db.query("SELECT cambiado_por FROM historial_estados_pedido WHERE pedido_id=$1 AND estado_id='entregado'", [id])).rows[0].cambiado_por).toBe(caja);
});
test('recupera exactamente el mismo comprobante ante una respuesta perdida', async () => {
  const id = await pedido(), recibo = await cobrar(id);
  expect(await cobrar(id)).toEqual(recibo);
  expect((await db.query('SELECT * FROM pagos WHERE pedido_id=$1', [id])).rows).toHaveLength(1);
  await expect(cobrar(id, { clave: '00000000-0000-0000-0000-000000000098' })).rejects.toThrow(/ya fue cobrado/);
  await expect(cobrar(id, { recibido: 100 })).rejects.toThrow(/ya fue cobrado/);
});
test.each(['tarjeta', 'yape', 'plin'])('registra %s con el importe exacto y sin vuelto', async metodo => {
  const id = await pedido();
  expect((await cobrar(id, { user: admin, metodo, recibido: 42.9, referencia: ' OP-123 ' })).pago).toMatchObject({ metodo, monto: 42.9, vuelto: 0, referencia: 'OP-123' });
});
test.each([
  ['efectivo insuficiente', { recibido: 42 }], ['monto negativo', { recibido: -50 }],
  ['fracción de céntimo', { recibido: 50.001 }], ['monto no finito', { recibido: 'NaN' }],
  ['método inválido', { metodo: 'gratis' }], ['método nulo', { metodo: null }],
  ['sobrante digital', { metodo: 'yape', recibido: 50 }], ['sin clave', { clave: null }],
  ['referencia extensa', { referencia: 'x'.repeat(121) }], ['total manipulado', { total: 0.01 }],
  ['total nulo', { total: null }], ['sin monto', { recibido: null }]
])('rechaza %s sin registrar pagos ni liberar la mesa', async (_name, options) => {
  const id = await pedido();
  await expect(cobrar(id, options)).rejects.toThrow();
  expect((await db.query('SELECT * FROM pagos')).rows).toHaveLength(0);
  expect((await db.query('SELECT estado FROM mesas WHERE id=1')).rows[0].estado).toBe('ocupada');
  expect((await db.query('SELECT estado_pago FROM pedidos WHERE id=$1', [id])).rows[0].estado_pago).toBe('pendiente');
});
test('exige revisar la cuenta cuando cambia la comanda', async () => {
  const id = await pedido();
  await asUser(mesera, 'SELECT agregar_items_pedido_mesera($1,$2)', [id, JSON.stringify([{ producto_id: 2, cantidad: 1 }])]);
  await expect(cobrar(id)).rejects.toThrow(/total cambió/);
});
test('rechaza pedidos cancelados, inexistentes y sin productos', async () => {
  const id = await pedido();
  await db.query("UPDATE pedidos SET estado_id='cancelado' WHERE id=$1", [id]);
  await expect(cobrar(id)).rejects.toThrow(/no admite/);
  await expect(cobrar('00000000-0000-0000-0000-000000000088')).rejects.toThrow(/no existe/);
  const vacio = (await asUser(mesera, "SELECT abrir_pedido_mesera(2,'PED-vacio-001') AS id")).rows[0].id;
  await expect(cobrar(vacio)).rejects.toThrow(/sin productos/);
});
test('cobra recojo sin alterar su estado operativo', async () => {
  const id = (await asUser(cliente, 'SELECT crear_pedido_cliente($1,$2,$3,$4,$5) AS id', ['LS-caja-recojo','recojo',JSON.stringify({ name: 'Ana Prueba', phone: '987654321' }),JSON.stringify([{ producto_id: 1, cantidad: 1 }]),'efectivo'])).rows[0].id;
  expect((await cobrar(id)).estadoPedido).toBe('recibido');
  expect((await db.query('SELECT estado_id FROM pedidos WHERE id=$1', [id])).rows[0].estado_id).toBe('recibido');
});
test('cliente, mesera y usuario sin perfil no pueden cobrar ni insertar pagos directamente', async () => {
  const id = await pedido();
  for (const user of [cliente, mesera, '00000000-0000-0000-0000-000000000080', '']) await expect(cobrar(id, { user })).rejects.toThrow(/Solo caja/);
  await expect(asUser(caja, "INSERT INTO pagos(pedido_id,registrado_por,monto,metodo,recibido,vuelto) VALUES ($1,$2,42.9,'efectivo',50,7.1)", [id,caja])).rejects.toThrow(/permission denied/);
});
test('la clave no puede reutilizarse para otro pedido y revierte el segundo cobro', async () => {
  await cobrar(await pedido());
  const segundo = await pedido('PED-caja-002');
  await expect(cobrar(segundo)).rejects.toThrow(/unique/);
  expect((await db.query('SELECT estado_pago FROM pedidos WHERE id=$1', [segundo])).rows[0].estado_pago).toBe('pendiente');
  expect((await db.query('SELECT estado FROM mesas WHERE id=1')).rows[0].estado).toBe('ocupada');
});

test('impide agregar, editar o borrar productos después del cobro', async () => {
  const id = await pedido(), recibo = await cobrar(id);
  await expect(asUser(mesera, 'SELECT agregar_items_pedido_mesera($1,$2)', [id,JSON.stringify([{ producto_id: 1, cantidad: 1 }])])).rejects.toThrow(/finalizado/);
  await expect(asUser(mesera, 'INSERT INTO detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario) VALUES ($1,1,1,1)', [id])).rejects.toThrow(/cobrado/);
  await expect(db.query('UPDATE detalles_pedido SET cantidad=3 WHERE pedido_id=$1', [id])).rejects.toThrow(/cobrado/);
  await expect(db.query('DELETE FROM detalles_pedido WHERE pedido_id=$1', [id])).rejects.toThrow(/cobrado/);
  expect(await cobrar(id)).toEqual(recibo);
});
