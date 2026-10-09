import { insforge } from '../lib/insforge';
import { getCurrentUser } from './authService';
export const ORDER_STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido' }, { key: 'preparacion', label: 'En preparación' },
  { key: 'listo', label: 'Listo' }, { key: 'camino', label: 'En camino' }, { key: 'entregado', label: 'Entregado' },
];
export const ORDER_PAGE_SIZE = 20;
function clientId() {
  const user = getCurrentUser();
  if (user?.rol !== 'cliente') throw new Error('Debes iniciar sesión como cliente.');
  return user.id;
}
function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
function mapOrder(row) {
  const items = (row.detalles_pedido || []).map(detail => ({
    id: detail.producto_id, name: detail.nombre_producto,
    price: Number(detail.precio_unitario), qty: detail.cantidad,
  }));
  return { id: row.codigo, databaseId: row.id, items,
    subtotal: Number(row.subtotal), shipping: Number(row.envio), total: Number(row.total),
    deliveryType: row.tipo, form: row.entrega, payment: row.metodo_pago_solicitado,
    createdAt: row.creado_en, status: row.estado_id };
}
const columns = 'id,codigo,subtotal,envio,total,tipo,entrega,metodo_pago_solicitado,creado_en,estado_id,detalles_pedido(producto_id,cantidad,precio_unitario,nombre_producto)';
async function getOrders({ page = 0 } = {}) {
  const rows = unwrap(await insforge.database.from('pedidos').select(columns)
    .eq('cliente_id', clientId()).order('creado_en', { ascending: false }).order('id', { ascending: false })
    .range(page * ORDER_PAGE_SIZE, (page + 1) * ORDER_PAGE_SIZE - 1));
  return (rows || []).map(mapOrder);
}
async function getOrderById(id) {
  const row = unwrap(await insforge.database.from('pedidos').select(columns)
    .eq('codigo', id).eq('cliente_id', clientId()).maybeSingle());
  return row ? mapOrder(row) : null;
}
async function getOrderState(id) {
  return unwrap(await insforge.database.from('pedidos').select('estado_id')
    .eq('codigo', id).eq('cliente_id', clientId()).maybeSingle());
}
async function getOrderHistory(databaseId) {
  clientId();
  return unwrap(await insforge.database.from('historial_estados_pedido')
    .select('id,estado_anterior,estado_id,cambiado_por,cambiado_en').eq('pedido_id', databaseId)
    .order('cambiado_en', { ascending: true }).order('id', { ascending: true }).limit(100)) || [];
}
async function createOrder({ id, items, deliveryType, form, payment }) {
  clientId();
  unwrap(await insforge.database.rpc('crear_pedido_cliente', {
    p_codigo: id, p_tipo: deliveryType, p_metodo_pago: payment || null,
    p_entrega: { name: form.name, phone: form.phone, address: form.address, reference: form.reference },
    p_items: items.map(({ product, qty }) => ({ producto_id: product.id, cantidad: qty })),
  }));
  const order = await getOrderById(id);
  if (!order) throw new Error('No pudimos consultar el pedido confirmado. Reintenta con el mismo carrito.');
  return order;
}
function getOrderStatus(order) { return order.status || 'recibido'; }
export default { getOrders, getOrderById, getOrderState, getOrderHistory, createOrder, getOrderStatus };
