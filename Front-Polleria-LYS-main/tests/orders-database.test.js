import { beforeAll, afterAll, expect, test } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
const db = new PGlite()
const alice = '00000000-0000-0000-0000-000000000011'
const bob = '00000000-0000-0000-0000-000000000012'
const staff = '00000000-0000-0000-0000-000000000013'
const delivery = { name: 'Cliente prueba', phone: '987654321', address: 'Av. Prueba 123', reference: '' }
async function asUser(id, sql, params = []) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false)`)
  try { return await db.query(sql, params) } finally { await db.exec('RESET ROLE') }
}
async function create(code, { user = alice, type = 'delivery', form = delivery, items = [{ producto_id: 1, cantidad: 2 }], payment = 'efectivo' } = {}) {
  return (await asUser(user, 'SELECT crear_pedido_cliente($1,$2,$3,$4,$5) AS id', [code,type,JSON.stringify(form),JSON.stringify(items),payment])).rows[0].id
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;`)
  const original = new URL('../../insforge/migrations/',import.meta.url)
  for (const name of (await readdir(original)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name,original),'utf8'))
  await db.query('INSERT INTO auth.users VALUES ($1),($2),($3)',[alice,bob,staff])
  await db.query("INSERT INTO perfiles(id,rol) VALUES ($1,'cliente'),($2,'cliente'),($3,'mesera')",[alice,bob,staff])
  await asUser(alice,`SELECT crear_pedido_cliente('LS-anterior','delivery','{}','[{"producto_id":1,"cantidad":1}]')`)
  const additions = new URL('../../migrations/',import.meta.url)
  for (const name of (await readdir(additions)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name,additions),'utf8'))

},30000)
afterAll(() => db.close())
test('delivery conserva precios, nombre vendido, envío y total calculados en servidor',async () => {
  const id = await create('LS-total',{ items:[{producto_id:1,cantidad:2,precio:0.01},{producto_id:2,cantidad:1}] })
  const row = (await asUser(alice,'SELECT subtotal,envio,total FROM pedidos WHERE id=$1',[id])).rows[0]
  expect(Number(row.subtotal)).toBe(110.7); expect(Number(row.envio)).toBe(6); expect(Number(row.total)).toBe(116.7)
  const sold = (await db.query('SELECT nombre_producto,precio_unitario FROM detalles_pedido WHERE pedido_id=$1 AND producto_id=1',[id])).rows[0]
  await db.exec("UPDATE productos SET nombre='Nombre nuevo',precio=99 WHERE id=1")
  expect((await db.query('SELECT nombre_producto,precio_unitario FROM detalles_pedido WHERE pedido_id=$1 AND producto_id=1',[id])).rows[0]).toEqual(sold)
  await db.exec("UPDATE productos SET nombre='Pollo a la Brasa',precio=42.9 WHERE id=1")
})
test('recojo no cobra envío y elimina una dirección que no corresponde',async () => {
  const id=await create('LS-recojo',{type:'recojo'})
  const row=(await db.query('SELECT subtotal,envio,total,entrega FROM pedidos WHERE id=$1',[id])).rows[0]
  expect(Number(row.envio)).toBe(0); expect(Number(row.total)).toBe(Number(row.subtotal)); expect(row.entrega.address).toBe('')
})
test('reintentar devuelve el mismo pedido incluso si cambió el catálogo',async () => {
  const id=await create('LS-reintento')
  await db.exec('UPDATE productos SET disponible=false WHERE id=1')
  expect(await create('LS-reintento')).toBe(id)
  await db.exec('UPDATE productos SET disponible=true WHERE id=1')
  expect((await db.query('SELECT id FROM pedidos WHERE codigo=$1',['LS-reintento'])).rows).toHaveLength(1)
  expect((await db.query('SELECT id FROM historial_estados_pedido WHERE pedido_id=$1',[id])).rows).toHaveLength(1)
  await expect(create('LS-reintento',{items:[{producto_id:1,cantidad:3}]})).rejects.toThrow(/utilizado/)
  await expect(create('LS-reintento',{user:bob})).rejects.toThrow(/utilizado/)
})
test('un producto inválido revierte pedido, detalles e historial completos',async () => {
  await expect(create('LS-rollback',{items:[{producto_id:1,cantidad:1},{producto_id:999999,cantidad:1}]})).rejects.toThrow(/disponible/)
  expect((await db.query("SELECT id FROM pedidos WHERE codigo='LS-rollback'")).rows).toHaveLength(0)
})
test.each([
  ['carrito vacío',{items:[]}],['cantidad cero',{items:[{producto_id:1,cantidad:0}]}],
  ['cantidad negativa',{items:[{producto_id:1,cantidad:-1}]}],['fracción',{items:[{producto_id:1,cantidad:1.5}]}],
  ['límite',{items:[{producto_id:1,cantidad:101}]}],['producto repetido',{items:[{producto_id:1,cantidad:1},{producto_id:1,cantidad:2}]}],
  ['teléfono',{form:{...delivery,phone:'123'}}],['dirección',{form:{...delivery,address:''}}],
  ['nombre',{form:{...delivery,name:' '}}],['entrega nula',{form:null}],['tipo salón',{type:'salon'}],['método inválido',{payment:'gratis'}]
])('rechaza %s desde la base de datos',async (_label,options) => { await expect(create('LS-invalido',options)).rejects.toThrow() })
test('RLS impide leer pedidos, detalles e historial de otro cliente incluso sin filtro',async () => {
  const id=await create('LS-privado',{user:bob})
  for(const table of ['pedidos','detalles_pedido','historial_estados_pedido']) {
    const column=table==='pedidos'?'id':'pedido_id'
    expect((await asUser(alice,`SELECT * FROM ${table} WHERE ${column}=$1`,[id])).rows).toHaveLength(0)
    expect((await asUser(bob,`SELECT * FROM ${table} WHERE ${column}=$1`,[id])).rows.length).toBeGreaterThan(0)
  }
})
test('el cliente no escribe encabezados vacíos, detalles, totales ni historial directamente',async () => {
  const id=await create('LS-protegido')
  await expect(asUser(alice,"INSERT INTO pedidos(codigo,cliente_id,creado_por,tipo) VALUES ('LS-ataque',$1,$1,'delivery')",[alice])).rejects.toThrow(/row-level security/)
  await expect(asUser(alice,'INSERT INTO detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario) VALUES ($1,1,1,0)',[id])).rejects.toThrow(/row-level security/)
  await expect(asUser(alice,'UPDATE pedidos SET subtotal=0 WHERE id=$1',[id])).rejects.toThrow(/permission denied/)
  await expect(asUser(alice,"UPDATE historial_estados_pedido SET estado_id='entregado'")).rejects.toThrow(/permission denied/)
  await expect(asUser(alice,'DELETE FROM historial_estados_pedido')).rejects.toThrow(/permission denied/)
  await expect(asUser(alice,'INSERT INTO historial_estados_pedido(pedido_id,estado_id) VALUES ($1,\'entregado\')',[id])).rejects.toThrow(/permission denied/)
})
test('los cambios de estado registran autor y fecha; otros cambios no duplican historial',async () => {
  const id=await create('LS-estados')
  await asUser(staff,"UPDATE pedidos SET estado_id='preparacion' WHERE id=$1",[id])
  await asUser(staff,"UPDATE pedidos SET observaciones='Sin ají' WHERE id=$1",[id])
  const history=(await asUser(alice,'SELECT estado_anterior,estado_id,cambiado_por,cambiado_en FROM historial_estados_pedido WHERE pedido_id=$1 ORDER BY id',[id])).rows
  expect(history).toHaveLength(2)
  expect(history[0]).toMatchObject({estado_anterior:null,estado_id:'recibido',cambiado_por:alice})
  expect(history[1]).toMatchObject({estado_anterior:'recibido',estado_id:'preparacion',cambiado_por:staff})
  expect(history[1].cambiado_en).toBeTruthy()
})
test('Mesera conserva el flujo de salón y los totales responden a futuros cambios de detalles',async () => {
  const id=(await asUser(staff,"INSERT INTO pedidos(codigo,mesa_id,creado_por,tipo) VALUES ('SALON-compat',1,$1,'salon') RETURNING id",[staff])).rows[0].id
  await asUser(staff,'INSERT INTO detalles_pedido(pedido_id,producto_id,cantidad,precio_unitario) VALUES ($1,1,2,42.9)',[id])
  expect(Number((await db.query('SELECT total FROM pedidos WHERE id=$1',[id])).rows[0].total)).toBe(85.8)
  await db.query('UPDATE detalles_pedido SET cantidad=1 WHERE pedido_id=$1',[id])
  expect(Number((await db.query('SELECT total FROM pedidos WHERE id=$1',[id])).rows[0].total)).toBe(42.9)
  await db.query('DELETE FROM detalles_pedido WHERE pedido_id=$1',[id])
  expect(Number((await db.query('SELECT total FROM pedidos WHERE id=$1',[id])).rows[0].total)).toBe(0)
})
test('un visitante o personal no ejecuta la confirmación del cliente',async () => {
  await expect(create('LS-staff',{user:staff})).rejects.toThrow(/cliente autenticado/)
  await db.exec('SET ROLE anon')
  try { await expect(db.query("SELECT crear_pedido_cliente('LS-anon','recojo','{}','[]')")).rejects.toThrow(/permission denied/) }
  finally { await db.exec('RESET ROLE') }
})

test('migrar conserva los pedidos anteriores y agrega importes y un estado conocido',async () => {
  const row=(await db.query("SELECT subtotal,envio,total FROM pedidos WHERE codigo='LS-anterior'")).rows[0]
  expect(Number(row.total)).toBe(48.9)
  const history=(await db.query("SELECT h.estado_id,h.cambiado_por FROM historial_estados_pedido h JOIN pedidos p ON p.id=h.pedido_id WHERE p.codigo='LS-anterior'")).rows
  expect(history).toEqual([{estado_id:'recibido',cambiado_por:null}])
})
