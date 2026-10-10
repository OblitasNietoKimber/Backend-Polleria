import { beforeAll, afterAll, expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
const db = new PGlite();
const users = { cocina: '00000000-0000-0000-0000-000000000031', cliente: '00000000-0000-0000-0000-000000000032', otro: '00000000-0000-0000-0000-000000000033', mesera: '00000000-0000-0000-0000-000000000034', admin: '00000000-0000-0000-0000-000000000035', caja: '00000000-0000-0000-0000-000000000036' };
async function asUser(id, sql, params = []) {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  try { return await db.query(sql,params); } finally { await db.exec('RESET ROLE'); await db.exec("SELECT set_config('request.jwt.claim.sub','',false)"); }
}
async function create(code, type = 'recojo') {
  return (await asUser(users.cliente,'SELECT crear_pedido_cliente($1,$2,$3,$4,$5) AS id', [code,type,JSON.stringify({name:'Prueba',phone:'987654321',address:'Av. Prueba 123'}),JSON.stringify([{producto_id:1,cantidad:2}]),'efectivo'])).rows[0].id;
}
const change = (id,from,to,user=users.cocina) => asUser(user,'UPDATE pedidos SET estado_id=$3 WHERE id=$1 AND estado_id=$2 RETURNING id',[id,from,to]);
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
    CREATE SCHEMA realtime;
    CREATE TABLE realtime.channels(pattern text PRIMARY KEY,description text,enabled boolean);
    CREATE TABLE realtime.messages(channel_name text,event_name text,payload jsonb);
    GRANT USAGE ON SCHEMA realtime TO anon,authenticated;
    GRANT SELECT ON realtime.channels,realtime.messages TO anon,authenticated;
    GRANT INSERT ON realtime.messages TO anon,authenticated;
    CREATE FUNCTION realtime.channel_name() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.channel',true) $$;
    CREATE FUNCTION realtime.publish(text,text,jsonb) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ INSERT INTO realtime.messages VALUES ($1,$2,$3) $$;`);
  for (const directory of ['../../insforge/migrations/','../../migrations/']) {
    const base = new URL(directory,import.meta.url);
    for (const file of (await readdir(base)).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,base),'utf8'));
  }
  for (const [role,id] of Object.entries(users)) {
    await db.query('INSERT INTO auth.users VALUES ($1)',[id]);
    await db.query('INSERT INTO perfiles(id,nombre,rol) VALUES ($1,$2,$3)',[id,role,role === 'otro' ? 'cliente' : role]);
  }
},30000);
afterAll(()=>db.close());
test('consulta productos vendidos, observaciones y estados con permisos de cocina',async()=>{
  const id=await create('LS-cocina-consulta');
  await asUser(users.admin,"UPDATE pedidos SET observaciones='Sin ají' WHERE id=$1",[id]);
  expect((await asUser(users.cocina,'SELECT estado_id,observaciones FROM pedidos WHERE id=$1',[id])).rows[0]).toEqual({estado_id:'recibido',observaciones:'Sin ají'});
  expect((await asUser(users.cocina,'SELECT cantidad,nombre_producto FROM detalles_pedido WHERE pedido_id=$1',[id])).rows[0]).toMatchObject({cantidad:2,nombre_producto:expect.any(String)});
  expect((await asUser(users.cocina,'SELECT numero FROM mesas')).rows).toHaveLength(16);
});
test.each([['recibido','listo'],['recibido','entregado'],['recibido',null],['recibido','inventado']])('rechaza salto %s a %s',async(from,to)=>{
  const id=await create(`LS-invalid-${to || 'null'}`);
  await expect(change(id,from,to)).rejects.toThrow(/no permitida/);
  expect((await db.query('SELECT estado_id FROM pedidos WHERE id=$1',[id])).rows[0].estado_id).toBe('recibido');
});
test('entrega recojo después de listo y mantiene delivery esperando reparto',async()=>{
  const id=await create('LS-entrega-recojo'); await change(id,'recibido','preparacion'); await change(id,'preparacion','listo'); await change(id,'listo','entregado');
  const delivery=await create('LS-espera-delivery','delivery'); await change(delivery,'recibido','preparacion'); await change(delivery,'preparacion','listo');
  await expect(change(delivery,'listo','entregado')).rejects.toThrow(/no permitida/);
});
test('no prepara pedidos vacíos y deja intactos estado e historial',async()=>{
  const id=(await asUser(users.mesera,"SELECT abrir_pedido_mesera(2,'PED-vacio-cocina',2,'') AS id")).rows[0].id;
  await expect(change(id,'recibido','preparacion')).rejects.toThrow(/sin productos/);
  expect((await db.query('SELECT id FROM historial_estados_pedido WHERE pedido_id=$1',[id])).rows).toHaveLength(1);
});
