import { beforeEach, expect, test, vi } from 'vitest'
const { query, rpc, user } = vi.hoisted(() => ({ query: {}, rpc: vi.fn(), user: vi.fn() }))
vi.mock('../src/lib/insforge', () => ({ insforge: { database: { from: vi.fn(() => query), rpc } } }))
vi.mock('../src/services/authService', () => ({ getCurrentUser: user }))
import orders from '../src/services/orderService'
const row = { id:'db-id',codigo:'LS-1234',subtotal:'42.90',envio:'6.00',total:'48.90',tipo:'delivery',entrega:{name:'Ana'},metodo_pago_solicitado:'efectivo',estado_id:'recibido',creado_en:'2026-10-08',detalles_pedido:[{producto_id:1,cantidad:1,precio_unitario:'42.90',nombre_producto:'Nombre vendido'}] }
beforeEach(() => {
  vi.clearAllMocks(); user.mockReturnValue({id:'cliente',rol:'cliente'})
  for (const method of ['select','eq','order','range','limit']) query[method] = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue({data:row,error:null})
  query.then = (resolve) => resolve({data:[row],error:null})
  rpc.mockResolvedValue({data:'db-id',error:null})
})
test('usa importes y nombre vendidos del servidor sin recalcularlos en el navegador',async () => {
  const order=await orders.getOrderById('LS-1234')
  expect(order).toMatchObject({subtotal:42.9,shipping:6,total:48.9,payment:'efectivo',items:[{name:'Nombre vendido',qty:1,price:42.9,id:1}]})
  expect(query.eq).toHaveBeenCalledWith('cliente_id','cliente')
})
test('confirmar solo envía identificadores, cantidades, contacto y método solicitado',async () => {
  const order=await orders.createOrder({id:'LS-1234',items:[{product:{id:1,price:0.01},qty:1}],deliveryType:'delivery',form:{name:'Ana',phone:'987654321',address:'Av. Prueba',reference:''},payment:'efectivo',total:0.01})
  expect(order.total).toBe(48.9)
  expect(rpc).toHaveBeenCalledWith('crear_pedido_cliente',expect.objectContaining({p_codigo:'LS-1234',p_items:[{producto_id:1,cantidad:1}],p_metodo_pago:'efectivo'}))
  expect(rpc.mock.calls[0][1]).not.toHaveProperty('total')
})
test('conserva el error del servidor para que el carrito pueda reintentar',async () => {
  rpc.mockResolvedValue({data:null,error:{message:'Producto no disponible'}})
  await expect(orders.createOrder({id:'LS-1234',items:[],form:{},deliveryType:'recojo'})).rejects.toThrow('Producto no disponible')
})
test('la lista limita cada página y filtra al cliente actual',async () => {
  await orders.getOrders({page:2})
  expect(query.range).toHaveBeenCalledWith(40,59)
  expect(query.eq).toHaveBeenCalledWith('cliente_id','cliente')
})
test('la consulta periódica obtiene únicamente el estado',async () => {
  await orders.getOrderState('LS-1234')
  expect(query.select).toHaveBeenCalledWith('estado_id')
})
test('un usuario sin rol cliente no consulta ni confirma pedidos',async () => {
  user.mockReturnValue({id:'personal',rol:'cocina'})
  await expect(orders.getOrders()).rejects.toThrow('cliente')
  await expect(orders.getOrderById('LS-1234')).rejects.toThrow('cliente')
  await expect(orders.getOrderHistory('db-id')).rejects.toThrow('cliente')
})
