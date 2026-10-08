import { beforeAll, afterAll, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const db = new PGlite();
const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';
const staff = '00000000-0000-0000-0000-000000000003';
async function asUser(id, sql) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
  try { return await db.query(sql); }
  finally { await db.exec('RESET ROLE;'); }
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);

    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;`);
  for (const name of ['001_schema.sql','002_datos_iniciales.sql','003_permisos.sql','004_crear_pedido.sql']) {
    await db.exec(await readFile(new URL('../../insforge/migrations/'+name, import.meta.url), 'utf8'));
  }
  await db.exec(`INSERT INTO auth.users VALUES ('${alice}'),('${bob}'),('${staff}');`);
  await asUser(alice, `INSERT INTO perfiles(id,nombre) VALUES ('${alice}','Alice')`);
  await asUser(bob, `INSERT INTO perfiles(id,nombre) VALUES ('${bob}','Bob')`);
  await db.exec(`INSERT INTO perfiles(id,rol) VALUES ('${staff}','cocina');
    INSERT INTO pedidos(codigo,cliente_id,creado_por,tipo) VALUES ('A','${alice}','${alice}','delivery'),('B','${bob}','${bob}','recojo');`);
}, 30000);
afterAll(() => db.close());
test('carga el catálogo y las mesas sin órdenes ficticias', async () => {
  expect((await db.query('SELECT count(*)::int AS n FROM productos')).rows[0].n).toBe(17);
  expect((await db.query('SELECT count(*)::int AS n FROM mesas')).rows[0].n).toBe(16);
});
test('un cliente solo lee su perfil y sus pedidos', async () => {
  expect((await asUser(alice, 'SELECT nombre FROM perfiles')).rows).toEqual([{ nombre: 'Alice' }]);
  expect((await asUser(alice, 'SELECT codigo FROM pedidos')).rows).toEqual([{ codigo: 'A' }]);
});
test('nadie se convierte en administrador desde la API pública', async () => {
  await expect(asUser(alice, "UPDATE perfiles SET rol='admin' WHERE id=auth.uid()" )).rejects.toThrow(/permission denied/);
  await expect(asUser(alice, `INSERT INTO perfiles(id,rol) VALUES ('${alice}','admin')`)).rejects.toThrow(/permission denied/);
});
test('un cliente no modifica a otro ni los estados de cocina', async () => {
  expect((await asUser(alice, `UPDATE perfiles SET nombre='Ataque' WHERE id='${bob}' RETURNING id`)).rows).toEqual([]);
  expect((await asUser(alice, "UPDATE pedidos SET estado_id='entregado' RETURNING id")).rows).toEqual([]);
  await expect(asUser(alice, `INSERT INTO pedidos(codigo,cliente_id,creado_por,tipo) VALUES ('X','${bob}','${alice}','delivery')`)).rejects.toThrow(/row-level security/);
});
test('cocina consulta pedidos y cambia su estado, pero no cobra', async () => {
  expect((await asUser(staff, 'SELECT codigo FROM pedidos ORDER BY codigo')).rows).toHaveLength(2);
  expect((await asUser(staff, "UPDATE pedidos SET estado_id='preparacion' WHERE codigo='A' RETURNING codigo")).rows).toHaveLength(1);
  await expect(asUser(staff, `INSERT INTO pagos(pedido_id,registrado_por,monto,metodo) SELECT id,'${staff}',10,'efectivo' FROM pedidos LIMIT 1`)).rejects.toThrow(/row-level security/);
});
test('el acceso anónimo se limita al catálogo', async () => {
  await db.exec('SET ROLE anon');
  try {
    expect((await db.query('SELECT id FROM categorias')).rows).toHaveLength(4);
    await expect(db.query('SELECT * FROM perfiles')).rejects.toThrow(/permission denied/);
    await expect(db.query('SELECT * FROM pedidos')).rejects.toThrow(/permission denied/);
  } finally { await db.exec('RESET ROLE'); }
});

test('el pedido usa precios del servidor y no permite cantidades inválidas', async () => {
  const created = await asUser(alice, `SELECT crear_pedido_cliente('RPC','delivery','{}','[{"producto_id":1,"cantidad":2,"precio":0.01}]') AS id`);
  const id = created.rows[0].id;
  expect((await asUser(alice, `SELECT precio_unitario::float AS precio FROM detalles_pedido WHERE pedido_id='${id}'`)).rows).toEqual([{ precio: 42.9 }]);
  await expect(asUser(alice, `SELECT crear_pedido_cliente('INVALID','delivery','{}','[{"producto_id":1,"cantidad":-1}]')`)).rejects.toThrow('inválidos');
  expect((await db.query("SELECT id FROM pedidos WHERE codigo='INVALID'")).rows).toHaveLength(0);
});
test('Caja cobra sin modificar pedidos y Mesera no modifica productos', async () => {
  await db.exec(`UPDATE perfiles SET rol='caja' WHERE id='${staff}'`);
  expect((await asUser(staff, `INSERT INTO pagos(pedido_id,registrado_por,monto,metodo) SELECT id,'${staff}',10,'efectivo' FROM pedidos LIMIT 1 RETURNING id`)).rows).toHaveLength(1);
  expect((await asUser(staff, "UPDATE pedidos SET estado_id='entregado' RETURNING id")).rows).toHaveLength(0);
  await db.exec(`UPDATE perfiles SET rol='mesera' WHERE id='${staff}'`);
  expect((await asUser(staff, "UPDATE mesas SET estado='ocupada' WHERE id=1 RETURNING id")).rows).toHaveLength(1);
  expect((await asUser(staff, "UPDATE productos SET precio=0 RETURNING id")).rows).toHaveLength(0);
  await db.exec(`UPDATE perfiles SET rol='admin' WHERE id='${staff}'`);
  expect((await asUser(staff, "UPDATE productos SET precio=43 WHERE id=1 RETURNING id")).rows).toHaveLength(1);
});
