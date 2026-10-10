import { test, expect } from '@playwright/test';
const ids={cocina:'00000000-0000-0000-0000-000000000031',cliente:'00000000-0000-0000-0000-000000000032'};
function fixture() {
 const row={id:'00000000-0000-0000-0000-000000000090',codigo:'LS-cocina-prueba',tipo:'recojo',estado_id:'recibido',observaciones:'Sin ají',creado_en:new Date().toISOString(),subtotal:'42.90',envio:'0',total:'42.90',entrega:{name:'Cliente',phone:'987654321'},mesas:null,detalles_pedido:[{id:1,producto_id:1,cantidad:1,nombre_producto:'Pollo vendido',precio_unitario:'42.90'}]};
 const history=[{id:1,estado_id:'recibido',cambiado_por:ids.cliente,cambiado_en:row.creado_en}];
 const sockets=new Set();const calls=[];let reject=false;
 function publish(){for(const {ws,channel} of sockets) ws.send('42'+JSON.stringify(['lys:pedido-actualizado',{pedidoId:row.id,meta:{channel,messageId:crypto.randomUUID(),senderType:'system',timestamp:new Date().toISOString()}}]));}
 async function install(page,role='cocina') {
  await page.addInitScript(()=>localStorage.setItem('lys_pedidos',JSON.stringify([{id:'PED-ANTIGUO',items:[],estadoCocina:'nuevo'}])));
  await page.routeWebSocket('**/socket.io/**',ws=>{
   ws.send('0'+JSON.stringify({sid:'socket-prueba',upgrades:[],pingInterval:25000,pingTimeout:20000,maxPayload:1000000}));
   ws.onMessage(message=>{
    const value=String(message);
    if(value.startsWith('40')) ws.send('40'+JSON.stringify({sid:'socket-prueba'}));
    const match=value.match(/^42(\d+)(\[.*)$/);
    if(match){const [event,payload]=JSON.parse(match[2]);if(event==='realtime:subscribe') {sockets.add({ws,channel:payload.channel});ws.send(`43${match[1]}`+JSON.stringify([{ok:true,channel:payload.channel,presence:{members:[]}}]));}}
    if(value==='2')ws.send('3');
   });
  });
  await page.route('https://mpy5z5dn.us-east.insforge.app/**',async route=>{
   const request=route.request(),url=new URL(request.url());let response={},status=200;
   if(url.pathname==='/api/auth/refresh')response={user:{id:ids[role],email:`${role}@example.test`,emailVerified:true},accessToken:`${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({sub:ids[role],exp:Math.floor(Date.now()/1000)+3600}))}.test`};
   else if(url.pathname.endsWith('/perfiles'))response={id:ids[role],rol:role,nombre:role};
   else if(url.pathname.endsWith('/rpc/cambiar_estado_cocina')) {
    const body=request.postDataJSON();calls.push(body);
    if(reject){status=409;response={message:'Otro usuario cambió este pedido. Actualiza el panel.',code:'40001'};}
    else {await new Promise(resolve=>setTimeout(resolve,100));row.estado_id=body.p_nuevo_estado;history.push({id:history.length+1,estado_anterior:body.p_estado_actual,estado_id:body.p_nuevo_estado,cambiado_por:ids.cocina,cambiado_en:new Date().toISOString()});response=row.id;publish();}
   } else if(url.pathname.endsWith('/pedidos')) {
    const mapped={...row,historial_estados_pedido:history};
    if(url.searchParams.get('select')==='estado_id')response={estado_id:row.estado_id};
    else if(url.searchParams.has('codigo'))response=mapped;
    else if(url.searchParams.get('estado_id')==='eq.entregado')response=row.estado_id==='entregado'?[mapped]:[];
    else response=row.estado_id==='entregado'?[]:[mapped];
   } else if(url.pathname.endsWith('/historial_estados_pedido'))response=history;
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  });
 }
 return {row,calls,install,publish,sockets,reject:()=>{reject=true;}};
}
test('cocina consulta PostgreSQL, avanza estados desde el panel',async({page})=>{
 const backend=fixture();await backend.install(page);
 await page.goto('/cocina');
 await expect(page.getByText('Sin ají')).toBeVisible();await expect(page.getByText('Pollo vendido')).toBeVisible();await expect(page.getByText('PED-ANTIGUO')).toHaveCount(0);
 await page.getByRole('button',{name:'Comenzar'}).click();await expect(page.getByRole('button',{name:'Marcar listo'})).toBeVisible();
 await page.getByRole('button',{name:'Marcar listo'}).click();await expect(page.getByRole('button',{name:'Entregar',exact:true})).toBeVisible();
 expect(backend.calls).toEqual([{p_pedido_id:backend.row.id,p_estado_actual:'recibido',p_nuevo_estado:'preparacion'},{p_pedido_id:backend.row.id,p_estado_actual:'preparacion',p_nuevo_estado:'listo'}]);
});
test('rechazo de concurrencia deja el pedido visible y muestra el error',async({page})=>{
 const backend=fixture();backend.reject();await backend.install(page);await page.goto('/cocina');
 await page.getByRole('button',{name:'Comenzar'}).click();await expect(page.getByRole('alert')).toContainText('Otro usuario');await expect(page.getByRole('button',{name:'Comenzar'})).toBeEnabled();
});
test('filtra recojo y mantiene delivery listo para reparto sin entregar desde cocina',async({page})=>{
 const backend=fixture();backend.row.estado_id='listo';backend.row.tipo='delivery';await backend.install(page);await page.goto('/cocina');
 await expect(page.getByText('Listo para reparto')).toBeVisible();await expect(page.getByRole('button',{name:'Entregar',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Para llevar',exact:true}).click();await expect(page.getByText('Pollo vendido')).toHaveCount(0);
});
test('recupera cambios por consulta automática cuando WebSocket no está disponible',async({page})=>{
 const backend=fixture();await backend.install(page);await page.routeWebSocket('**/socket.io/**',ws=>ws.close());await page.goto('/cocina');
 await expect(page.getByRole('button',{name:'Comenzar'})).toBeVisible();backend.row.estado_id='preparacion';await expect(page.getByRole('button',{name:'Marcar listo'})).toBeVisible({timeout:8000});
});
