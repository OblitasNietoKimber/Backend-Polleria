import { insforge, configurationError } from '../lib/insforge';
import { getCurrentUser } from './authService';

const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
const CAMPOS = 'id, codigo, tipo, estado_id, estado_pago, cuenta_solicitada, entrega, subtotal, envio, total, creado_en, mesas(numero), detalles_pedido(producto_id, cantidad, precio_unitario, nombre_producto), pagos(id, metodo, monto, recibido, vuelto, referencia, creado_en, comprobante)';

function database() {
  if (configurationError) throw new Error(configurationError);
  if (!['caja', 'admin'].includes(getCurrentUser()?.rol)) throw new Error('Se requiere una cuenta de caja o administrador.');
  if (!insforge) throw new Error('No se pudo conectar con InsForge.');
  return insforge.database;
}
function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'No se pudo consultar caja.');
  return data;
}
function normalizarComprobante(recibo) {
  return {
    ...recibo,
    subtotal: Number(recibo.subtotal), envio: Number(recibo.envio), total: Number(recibo.total),
    items: (recibo.items || []).map(item => ({ ...item, cantidad: Number(item.cantidad), precio: Number(item.precio) })),
    pago: { ...recibo.pago, metodoId: recibo.pago.metodo,
      metodo: METODOS[recibo.pago.metodo] || recibo.pago.metodo,
      monto: Number(recibo.pago.monto), importe: Number(recibo.pago.importe), vuelto: Number(recibo.pago.vuelto) },
  };
}
function normalizarPedido(row) {
  const pago = row.pagos?.[0];
  if (pago?.comprobante) return normalizarComprobante(pago.comprobante);
  return {
    id: row.id, codigo: row.codigo, tipo: row.tipo, mesa: row.mesas?.numero || null,
    cliente: row.entrega?.name || (row.mesas ? `Mesa ${row.mesas.numero}` : 'Cliente'),
    estado: pago || row.estado_pago === 'pagado' ? 'pagado' : row.estado_id === 'cancelado' ? 'cancelado' : 'pendiente',
    estadoPedido: row.estado_id, cuentaSolicitada: Boolean(row.cuenta_solicitada),
    subtotal: Number(row.subtotal), envio: Number(row.envio), total: Number(pago?.monto ?? row.total),
    createdAt: row.creado_en, pagadoAt: pago?.creado_en || null,
    items: (row.detalles_pedido || []).map(item => ({ id: item.producto_id, nombre: item.nombre_producto,
      cantidad: Number(item.cantidad), precio: Number(item.precio_unitario) })),
    pago: pago ? { id: pago.id, metodoId: pago.metodo, metodo: METODOS[pago.metodo],
      monto: Number(pago.recibido), importe: Number(pago.monto), vuelto: Number(pago.vuelto), referencia: pago.referencia } : null,
  };
}
async function consultar(estado = null) {
  const db = database(), pedidos = [], size = 100;
  for (let offset = 0; ; offset += size) {
    let query = db.from('pedidos').select(CAMPOS).order('creado_en', { ascending: false }).order('id').range(offset, offset + size - 1);
    if (estado) query = query.eq('estado_pago', estado);
    if (estado === 'pendiente') query = query.neq('estado_id', 'cancelado').gt('total', 0);
    const rows = unwrap(await query) || [];
    pedidos.push(...rows.map(normalizarPedido));
    if (rows.length < size) return pedidos;
  }
}
export const getPedidos = () => consultar();
export const getPedidosPendientes = () => consultar('pendiente');
export const getVentas = () => consultar('pagado');
export async function getPedidoPorId(id) {
  const row = unwrap(await database().from('pedidos').select(CAMPOS).eq('id', id).maybeSingle());
  return row ? normalizarPedido(row) : null;
}
export function calcularTotal(pedido) { return Number(pedido.total); }
export default { getPedidos, getPedidosPendientes, getPedidoPorId, getVentas, calcularTotal };
