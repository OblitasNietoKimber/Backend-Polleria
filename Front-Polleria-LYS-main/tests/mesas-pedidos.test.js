import { beforeAll, afterAll, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

const db = new PGlite();
const mesera = '00000000-0000-0000-0000-000000000021';
const cliente = '00000000-0000-0000-0000-000000000022';
const admin = '00000000-0000-0000-0000-000000000023';

async function asUser(id, sql, params = []) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('RESET ROLE;');
  }
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
  `);

  // Migraciones base
  const original = new URL('../../insforge/migrations/', import.meta.url);
  for (const name of (await readdir(original)).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, original), 'utf8'));
  }

  await db.query('INSERT INTO auth.users VALUES ($1),($2),($3)', [mesera, cliente, admin]);
  await db.query(`
    INSERT INTO perfiles(id, nombre, rol) VALUES
      ($1, 'María Mesera', 'mesera'),
      ($2, 'Juan Cliente', 'cliente'),
      ($3, 'Carlos Admin', 'admin')
  `, [mesera, cliente, admin]);

  // Migraciones de la suite migrations/
  const additions = new URL('../../migrations/', import.meta.url);
  for (const name of (await readdir(additions)).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, additions), 'utf8'));
  }
}, 30000);

afterAll(() => db.close());

test('SCRUM-277: Mesera puede consultar las mesas y su estado desde PostgreSQL', async () => {
  const rows = (await asUser(mesera, 'SELECT id, numero, capacidad, estado FROM mesas ORDER BY id')).rows;
  expect(rows.length).toBe(16);
  expect(rows[0].numero).toBe('01');
  expect(rows[0].estado).toBe('libre');
});

test('SCRUM-278: Mesera abre un pedido de salón y la mesa pasa a estado ocupada', async () => {
  const res = (await asUser(
    mesera,
    "SELECT abrir_pedido_mesera(1, 'PED-01-1001', 4, 'Mesa cerca a la ventana') AS id"
  )).rows[0];

  expect(res.id).toBeDefined();

  const mesa = (await asUser(mesera, 'SELECT estado FROM mesas WHERE id = 1')).rows[0];
  expect(mesa.estado).toBe('ocupada');

  const pedido = (await asUser(mesera, 'SELECT * FROM pedidos WHERE id = $1', [res.id])).rows[0];
  expect(pedido.tipo).toBe('salon');
  expect(pedido.codigo).toBe('PED-01-1001');
  expect(pedido.comensales).toBe(4);
  expect(pedido.observaciones).toBe('Mesa cerca a la ventana');
  expect(pedido.estado_id).toBe('recibido');
});

test('SCRUM-282: Impide dos pedidos activos simultáneos en una misma mesa', async () => {
  // La mesa 1 ya tiene un pedido activo creado en el test anterior
  await expect(
    asUser(mesera, "SELECT abrir_pedido_mesera(1, 'PED-01-1002', 2, '')")
  ).rejects.toThrow();
});

test('SCRUM-279: Permite agregar productos y observaciones con precios reales del servidor', async () => {
  const pedido = (await db.query("SELECT id FROM pedidos WHERE codigo = 'PED-01-1001'")).rows[0];

  // Agregar 2 unidades de producto 1 (Pollo a la Brasa - 42.90) y 1 unidad de producto 2 (Mostrito - 24.90)
  const items = [
    { producto_id: 1, cantidad: 2 },
    { producto_id: 2, cantidad: 1 },
  ];

  await asUser(
    mesera,
    'SELECT agregar_items_pedido_mesera($1, $2, $3)',
    [pedido.id, JSON.stringify(items), 'Bien dorado']
  );

  const detalles = (await asUser(
    mesera,
    'SELECT producto_id, cantidad, precio_unitario, nombre_producto FROM detalles_pedido WHERE pedido_id = $1 ORDER BY producto_id',
    [pedido.id]
  )).rows;

  expect(detalles.length).toBe(2);
  expect(Number(detalles[0].precio_unitario)).toBe(42.90);
  expect(detalles[0].cantidad).toBe(2);

  // Trigger automático recalcula subtotal y total sin costo de envío (envio = 0 para salón)
  const pedidoActualizado = (await asUser(
    mesera,
    'SELECT subtotal, envio, total, observaciones FROM pedidos WHERE id = $1',
    [pedido.id]
  )).rows[0];

  expect(Number(pedidoActualizado.subtotal)).toBe(110.70);
  expect(Number(pedidoActualizado.envio)).toBe(0);
  expect(Number(pedidoActualizado.total)).toBe(110.70);
  expect(pedidoActualizado.observaciones).toBe('Bien dorado');
});

test('SCRUM-280: Registrar el envío del pedido a cocina y auditar en historial', async () => {
  const pedido = (await db.query("SELECT id FROM pedidos WHERE codigo = 'PED-01-1001'")).rows[0];

  await asUser(mesera, 'SELECT enviar_pedido_cocina_mesera($1)', [pedido.id]);

  const row = (await asUser(mesera, 'SELECT estado_id FROM pedidos WHERE id = $1', [pedido.id])).rows[0];
  expect(row.estado_id).toBe('preparacion');

  const historial = (await asUser(
    mesera,
    'SELECT estado_anterior, estado_id FROM historial_estados_pedido WHERE pedido_id = $1 ORDER BY id DESC LIMIT 1',
    [pedido.id]
  )).rows[0];

  expect(historial.estado_anterior).toBe('recibido');
  expect(historial.estado_id).toBe('preparacion');
});

test('SCRUM-281: Registrar la solicitud de cuenta para caja en PostgreSQL', async () => {
  const pedido = (await db.query("SELECT id FROM pedidos WHERE codigo = 'PED-01-1001'")).rows[0];

  await asUser(mesera, 'SELECT solicitar_cuenta_mesa($1)', [pedido.id]);

  const row = (await asUser(mesera, 'SELECT cuenta_solicitada FROM pedidos WHERE id = $1', [pedido.id])).rows[0];
  expect(row.cuenta_solicitada).toBe(true);
});

test('Seguridad RLS: Un cliente no puede abrir pedidos de salón ni cambiar mesas', async () => {
  await expect(
    asUser(cliente, "SELECT abrir_pedido_mesera(2, 'PED-02-1001', 2, '')")
  ).rejects.toThrow();

  const updateAttempt = await asUser(cliente, "UPDATE mesas SET estado = 'ocupada' WHERE id = 2 RETURNING id");
  expect(updateAttempt.rows).toEqual([]);
});

test('Liberar mesa: exige el cobro de caja antes de concluir la atención', async () => {
  await expect(asUser(mesera, 'SELECT liberar_mesa(1)')).rejects.toThrow(/pago/);
  const id = (await db.query("SELECT id FROM pedidos WHERE codigo = 'PED-01-1001'")).rows[0].id;
  await db.query("UPDATE perfiles SET rol='caja' WHERE id=$1", [admin]);
  await asUser(admin, "SELECT registrar_cobro($1,'efectivo',120,'00000000-0000-0000-0000-000000000090',110.7)", [id]);

  const mesa = (await asUser(mesera, 'SELECT estado FROM mesas WHERE id = 1')).rows[0];
  expect(mesa.estado).toBe('libre');

  const pedido = (await db.query("SELECT estado_id FROM pedidos WHERE codigo = 'PED-01-1001'")).rows[0];
  expect(pedido.estado_id).toBe('entregado');
});
