import { insforge, configurationError } from '../lib/insforge';
import { getCurrentUser } from './authService';

export const ESTADOS_COCINA = { NUEVO: 'nuevo', EN_PREPARACION: 'en_preparacion', LISTO: 'listo', ENTREGADO: 'entregado' };
const estados = { recibido: 'nuevo', preparacion: 'en_preparacion', listo: 'listo', entregado: 'entregado' };
const estadosServidor = { nuevo: 'recibido', en_preparacion: 'preparacion', listo: 'listo', entregado: 'entregado' };
const columns = 'id,codigo,tipo,estado_id,observaciones,creado_en,mesas(numero),detalles_pedido(id,producto_id,cantidad,nombre_producto),historial_estados_pedido(id,estado_id,cambiado_por,cambiado_en)';
function database() {
  if (configurationError) throw new Error(configurationError);
  if (!['cocina','admin'].includes(getCurrentUser()?.rol)) throw new Error('Debes iniciar sesión como personal de cocina.');
  return insforge.database;
}
function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'No se pudo consultar cocina.');
  return data;
}
export function mapPedido(row) {
  const history = [...(row.historial_estados_pedido || [])].sort((a,b) => new Date(b.cambiado_en) - new Date(a.cambiado_en) || Number(b.id) - Number(a.id));
  const listo = history.find(h => h.estado_id === 'listo');
  const ultimo = history[0];
  return { id: row.codigo, databaseId: row.id, tipo: row.tipo, estadoCocina: estados[row.estado_id],
    mesa: row.mesas?.numero || null, cliente: row.mesas ? `Mesa ${row.mesas.numero}` : row.codigo,
    observaciones: row.observaciones, createdAt: row.creado_en,
    finalizadoAt: listo?.cambiado_en || (row.estado_id === 'entregado' ? ultimo?.cambiado_en : null),
    cambiadoPor: ultimo?.cambiado_por || null, cambiadoEn: ultimo?.cambiado_en || null,
    items: (row.detalles_pedido || []).map(d => ({ id: d.id, productoId: d.producto_id, nombre: d.nombre_producto, cantidad: d.cantidad })) };
}
async function getPedidosActivos() {
  const db = database();
  // Pagina para no ocultar pedidos pendientes al superar el límite de PostgREST.
  const result = [];
  for (let offset = 0; ; offset += 100) {
    const rows = unwrap(await db.from('pedidos').select(columns).in('estado_id',['recibido','preparacion','listo'])
      .order('creado_en',{ascending:true}).order('id',{ascending:true}).range(offset,offset+99)) || [];
    result.push(...rows.filter(row => row.detalles_pedido?.length).map(mapPedido));
    if (rows.length < 100) return result;
  }
}
async function getPedidosFinalizados() {
  const rows = unwrap(await database().from('pedidos').select(columns).eq('estado_id','entregado')
    .order('creado_en',{ascending:false}).order('id',{ascending:false}).range(0,49)) || [];
  return rows.map(mapPedido);
}
async function cambiarEstado(pedido, nuevoEstado) {
  return unwrap(await database().rpc('cambiar_estado_cocina',{
    p_pedido_id: pedido.databaseId, p_estado_actual: estadosServidor[pedido.estadoCocina], p_nuevo_estado: estadosServidor[nuevoEstado],
  }));
}
export default { getPedidosActivos, getPedidosFinalizados, cambiarEstado };
