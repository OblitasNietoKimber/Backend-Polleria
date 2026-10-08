import { insforge } from '../lib/insforge';
import { getCurrentUser } from './authService';
export const ORDER_STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido' }, { key: 'preparacion', label: 'En preparación' },
  { key: 'listo', label: 'Listo' }, { key: 'camino', label: 'En camino' }, { key: 'entregado', label: 'Entregado' },
];
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
    id: detail.producto_id, name: detail.productos?.nombre || 'Producto',
    price: Number(detail.precio_unitario), qty: detail.cantidad,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = row.tipo === 'delivery' ? 6 : 0;
  return { id: row.codigo, databaseId: row.id, items, subtotal, shipping, total: subtotal + shipping,
    deliveryType: row.tipo, form: row.entrega, createdAt: row.creado_en, status: row.estado_id };
}
const columns = '*,detalles_pedido(producto_id,cantidad,precio_unitario,productos(nombre))';
async function getOrders() {
  const rows = unwrap(await insforge.database.from('pedidos').select(columns)
    .eq('cliente_id', clientId()).order('creado_en', { ascending: false }));
  return rows.map(mapOrder);
}
async function getOrderById(id) {
  const row = unwrap(await insforge.database.from('pedidos').select(columns)
    .eq('codigo', id).eq('cliente_id', clientId()).maybeSingle());
  return row ? mapOrder(row) : null;
}
async function createOrder({ id, items, deliveryType, form }) {
  clientId();
  unwrap(await insforge.database.rpc('crear_pedido_cliente', {
    p_codigo: id, p_tipo: deliveryType,
    p_entrega: { name: form.name, phone: form.phone, address: form.address, reference: form.reference },
    p_items: items.map(({ product, qty }) => ({ producto_id: product.id, cantidad: qty })),
  }));
}
function getOrderStatus(order) { return order.status || 'recibido'; }
export default { getOrders, getOrderById, createOrder, getOrderStatus };
