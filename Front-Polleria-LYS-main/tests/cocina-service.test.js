import { beforeEach, expect, test, vi } from 'vitest';
const { query, rpc, user, from } = vi.hoisted(() => ({query:{},rpc:vi.fn(),user:vi.fn(),from:vi.fn()}));
vi.mock('../src/lib/insforge',()=>({ insforge:{database:{from,rpc}},configurationError:'' }));
vi.mock('../src/services/authService',()=>({getCurrentUser:user}));
import cocina from '../src/services/cocinaService';
const row={id:'db-id',codigo:'LS-123',tipo:'recojo',estado_id:'listo',observaciones:'Sin ají',creado_en:'2026-10-09T10:00:00Z',mesas:null,detalles_pedido:[{id:1,producto_id:2,cantidad:3,nombre_producto:'Nombre vendido'}],historial_estados_pedido:[{id:2,estado_id:'listo',cambiado_por:'cocinero',cambiado_en:'2026-10-09T11:00:00Z'},{id:1,estado_id:'recibido',cambiado_en:'2026-10-09T10:00:00Z'}]};
beforeEach(()=>{
 vi.clearAllMocks(); user.mockReturnValue({id:'cocinero',rol:'cocina'}); from.mockReturnValue(query);
 for(const name of ['select','in','eq','order']) query[name]=vi.fn(()=>query);
 query.range=vi.fn().mockResolvedValue({data:[row],error:null}); rpc.mockResolvedValue({data:'db-id',error:null});
});
test('consulta datos de PostgreSQL y conserva nombres vendidos y auditoría',async()=>{
 expect(await cocina.getPedidosActivos()).toEqual([expect.objectContaining({id:'LS-123',databaseId:'db-id',tipo:'recojo',estadoCocina:'listo',observaciones:'Sin ají',finalizadoAt:'2026-10-09T11:00:00Z',cambiadoPor:'cocinero',items:[{id:1,productoId:2,nombre:'Nombre vendido',cantidad:3}]})]);
 expect(query.in).toHaveBeenCalledWith('estado_id',['recibido','preparacion','listo']);
});
test('continúa consultando cuando hay más de cien pedidos activos',async()=>{
 query.range.mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({...row,codigo:`LS-${i}`})),error:null});
 expect(await cocina.getPedidosActivos()).toHaveLength(101); expect(query.range).toHaveBeenLastCalledWith(100,199);
});
test('excluye comandas vacías mientras la mesera agrega los productos',async()=>{
 query.range.mockResolvedValue({data:[{...row,detalles_pedido:[]}],error:null}); expect(await cocina.getPedidosActivos()).toEqual([]);
});
test('envía UUID y estado observado a la RPC sin actualizar directamente',async()=>{
 await cocina.cambiarEstado({databaseId:'db-id',estadoCocina:'en_preparacion'},'listo');
 expect(rpc).toHaveBeenCalledWith('cambiar_estado_cocina',{p_pedido_id:'db-id',p_estado_actual:'preparacion',p_nuevo_estado:'listo'});
 expect(from).not.toHaveBeenCalled();
});
test('conserva el rechazo del servidor para recuperar el pedido actualizado',async()=>{
 rpc.mockResolvedValue({data:null,error:{message:'Otro usuario cambió este pedido.'}});
 await expect(cocina.cambiarEstado({databaseId:'db-id',estadoCocina:'nuevo'},'en_preparacion')).rejects.toThrow(/Otro usuario/);
});
test('el historial es paginado y muestra solo los pedidos entregados',async()=>{
 await cocina.getPedidosFinalizados({page:2}); expect(query.eq).toHaveBeenCalledWith('estado_id','entregado'); expect(query.range).toHaveBeenCalledWith(100,149);
});
test('cliente y mesera no consultan el panel de cocina',async()=>{
 user.mockReturnValue({rol:'cliente'}); await expect(cocina.getPedidosActivos()).rejects.toThrow(/cocina/); expect(from).not.toHaveBeenCalled();
});
