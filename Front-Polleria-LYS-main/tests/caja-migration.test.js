import { beforeAll, beforeEach, afterAll, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
const db = new PGlite();
const user = '00000000-0000-0000-0000-000000000071';
let migration;
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;`);
  const base = new URL('../../insforge/migrations/', import.meta.url);
  for (const name of (await readdir(base)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, base), 'utf8'));
  const additions = new URL('../../migrations/', import.meta.url);
  const files = (await readdir(additions)).filter(n => n.endsWith('.sql')).sort();
  const pending = [];
  for (const name of files) {
    const sql = await readFile(new URL(name, additions), 'utf8');
    if (name < '20261010005900') await db.exec(sql); else pending.push(sql);
  }
  migration = pending.join('\n');
  await db.query('INSERT INTO auth.users VALUES ($1)', [user]);
  await db.query("INSERT INTO perfiles(id,rol) VALUES ($1,'mesera')", [user]);
}, 30000);
beforeEach(() => db.exec('TRUNCATE pedidos CASCADE'));
afterAll(() => db.close());
async function legacy() {
  const id = (await db.query("INSERT INTO pedidos(codigo,mesa_id,creado_por,tipo) VALUES ('PED-legacy-001',1,$1,'salon') RETURNING id", [user])).rows[0].id;
  await db.query('INSERT INTO detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario) VALUES ($1,1,1,42.9)', [id]);
  return id;
}
async function oldPayment(id, amount = 42.9) {
  await db.query("INSERT INTO pagos(pedido_id,registrado_por,monto,metodo) VALUES ($1,$2,$3,'efectivo')", [id,user,amount]);
}
async function applyAndRollback() {
  try { await db.exec(`BEGIN;\n${migration}\nCOMMIT;`); } finally { await db.exec('ROLLBACK'); }
}
async function unchanged(id, payments) {
  expect((await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='pedidos' AND column_name='estado_pago'")).rows).toHaveLength(0);
  expect((await db.query('SELECT * FROM pagos WHERE pedido_id=$1', [id])).rows).toHaveLength(payments);
  expect(Number((await db.query('SELECT total FROM pedidos WHERE id=$1', [id])).rows[0].total)).toBe(42.9);
}
test('detiene la migración con pagos duplicados y conserva las cuentas originales', async () => {
  const id = await legacy(); await oldPayment(id); await oldPayment(id);
  await expect(applyAndRollback()).rejects.toThrow(/pagos múltiples/);
  await unchanged(id, 2);
});
test('detiene la migración si un pago anterior no liquida el total', async () => {
  const id = await legacy(); await oldPayment(id, 10);
  await expect(applyAndRollback()).rejects.toThrow(/no corresponden/);
  await unchanged(id, 1);
});
test('detiene la migración ante mesas históricas cerradas sin pago', async () => {
  const id = await legacy(); await db.query("UPDATE pedidos SET estado_id='entregado' WHERE id=$1", [id]);
  await expect(applyAndRollback()).rejects.toThrow(/mesas cerradas/);
  await unchanged(id, 0);
});
