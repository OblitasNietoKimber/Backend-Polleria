import { insforge, configurationError } from '../lib/insforge';
import { SEED_MESAS, ESTADOS_MESA } from '../data/mesasData';

function database() {
  if (configurationError) throw new Error(configurationError);
  return insforge?.database;
}

function unwrap({ data, error }, fallbackMsg = 'Error en la base de datos.') {
  if (error) throw new Error(error.message || fallbackMsg);
  return data;
}

/**
 * SCRUM-277: Consultar el estado de las mesas y sus pedidos activos directamente desde PostgreSQL.
 */
export async function getMesas() {
  const db = database();
  if (!db) return SEED_MESAS;

  const { data: mesasData, error: mesasError } = await db
    .from('mesas')
    .select('id, numero, capacidad, forma, zona, estado')
    .order('id');

  if (mesasError) {
    throw new Error(mesasError.message || 'Error al consultar mesas desde PostgreSQL.');
  }

  // Consultar pedidos activos de tipo salón
  const { data: pedidosActivos, error: pedidosError } = await db
    .from('pedidos')
    .select('id, codigo, mesa_id, estado_id, cuenta_solicitada, observaciones, comensales, creado_en, detalles_pedido(producto_id, cantidad, precio_unitario, nombre_producto)')
    .eq('tipo', 'salon')
    .not('estado_id', 'in', '("entregado","cancelado")');

  if (pedidosError) {
    throw new Error(pedidosError.message || 'Error al consultar pedidos activos de salón.');
  }

  const pedidosPorMesa = new Map();
  for (const pedido of (pedidosActivos || [])) {
    pedidosPorMesa.set(Number(pedido.mesa_id), pedido);
  }

  return (mesasData || []).map((m) => {
    const mesaId = Number(m.id);
    const pedido = pedidosPorMesa.get(mesaId);
    const tienePedidoActivo = Boolean(pedido);
    const total = pedido?.detalles_pedido?.reduce(
      (sum, d) => sum + (Number(d.cantidad) * Number(d.precio_unitario)),
      0
    ) || 0;

    return {
      id: mesaId,
      numero: String(m.numero).padStart(2, '0'),
      capacidad: m.capacidad,
      forma: m.forma,
      zona: m.zona,
      estado: tienePedidoActivo ? ESTADOS_MESA.OCUPADA : (m.estado || ESTADOS_MESA.LIBRE),
      pedidoId: pedido ? pedido.id : null,
      ordenCodigo: pedido ? pedido.codigo : null,
      comensales: pedido?.comensales || m.capacidad,
      observaciones: pedido?.observaciones || '',
      estadoCocina: ({ recibido: 'nuevo', preparacion: 'en_preparacion', listo: 'listo' })[pedido?.estado_id] || null,
      cuentaSolicitada: Boolean(pedido?.cuenta_solicitada),
      totalAcumulado: Number(total.toFixed(2)),
      inicioAt: pedido?.creado_en || null,
      items: (pedido?.detalles_pedido || []).map((d) => ({
        id: d.producto_id,
        nombre: d.nombre_producto || 'Producto',
        cantidad: d.cantidad,
        precio: Number(d.precio_unitario),
      })),
    };
  });
}

/**
 * Consulta una mesa específica por su número desde PostgreSQL.
 */
export async function getMesaByNumero(numero) {
  const mesas = await getMesas();
  const numNormalizado = String(numero).padStart(2, '0');
  return mesas.find((m) => String(m.numero).padStart(2, '0') === numNormalizado) || null;
}

/**
 * SCRUM-278 & SCRUM-282: Abrir pedido de salón y ocupar mesa mediante RPC transaccional.
 * Impide la apertura de múltiples pedidos activos en una misma mesa.
 */
export async function abrirPedidoMesa({ mesaId, comensales = 1, codigo = null, observaciones = '' }) {
  const db = database();
  const idMesa = Number(mesaId);

  // Verificación preventiva en cliente para rechazo inmediato
  const mesas = await getMesas();
  const mesa = mesas.find((m) => m.id === idMesa);
  if (mesa && mesa.pedidoId) {
    throw new Error(`La Mesa ${mesa.numero} ya cuenta con un pedido activo.`);
  }

  const codPedido = codigo || `PED-${String(idMesa).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

  const res = await db.rpc('abrir_pedido_mesera', {
    p_mesa_id: idMesa,
    p_codigo: codPedido,
    p_comensales: Number(comensales),
    p_observaciones: observaciones || '',
  });

  if (res.error) {
    if (res.error.code === '23505' || res.error.message?.includes('activo') || res.error.message?.includes('cuenta con un pedido')) {
      throw new Error('La mesa ya cuenta con un pedido activo en el servidor.');
    }
    throw new Error(res.error.message || 'No se pudo abrir el pedido en el servidor.');
  }

  return { pedidoId: res.data, codigo: codPedido };
}

/**
 * SCRUM-279: Agregar productos y observaciones con precios verificados en el servidor.
 */
export async function agregarItemsPedido({ pedidoId, items, observaciones = null }) {
  const db = database();
  const payloadItems = items.map((it) => ({
    producto_id: Number(it.id || it.producto_id),
    cantidad: Number(it.cantidad || it.qty || 1),
  }));

  const res = await db.rpc('agregar_items_pedido_mesera', {
    p_pedido_id: pedidoId,
    p_items: payloadItems,
    p_observaciones: observaciones,
  });

  return unwrap(res, 'No se pudieron registrar los productos en la comanda.');
}

/**
 * SCRUM-280: Enviar comanda a cocina y actualizar estado.
 */
export async function enviarCocina({ pedidoId }) {
  const db = database();
  const res = await db.rpc('enviar_pedido_cocina_mesera', {
    p_pedido_id: pedidoId,
  });
  return unwrap(res, 'No se pudo registrar el envío a cocina.');
}

/**
 * SCRUM-281: Registrar la solicitud de cuenta para caja.
 */
export async function solicitarCuentaMesa({ pedidoId }) {
  const db = database();
  const res = await db.rpc('solicitar_cuenta_mesa', {
    p_pedido_id: pedidoId,
  });
  return unwrap(res, 'No se pudo solicitar la cuenta en el servidor.');
}

/**
 * Liberar mesa y concluir su pedido activo.
 */
export async function liberarMesa({ mesaId }) {
  const db = database();
  const res = await db.rpc('liberar_mesa', {
    p_mesa_id: Number(mesaId),
  });
  return unwrap(res, 'No se pudo liberar la mesa en el servidor.');
}

export function getMinutosOcupada(inicioAt) {
  if (!inicioAt) return 0;
  const diffMs = Date.now() - new Date(inicioAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins > 180) return 35;
  return mins;
}

export function getEstadisticasMesas(mesas = [], zona = 'salon_principal') {
  const lista = (mesas || []).filter((m) => !zona || m.zona === zona);
  const total = lista.length || 1;

  const libres = lista.filter((m) => m.estado === ESTADOS_MESA.LIBRE).length;
  const ocupadas = lista.filter((m) => m.estado === ESTADOS_MESA.OCUPADA).length;
  const reservadas = lista.filter((m) => m.estado === ESTADOS_MESA.RESERVADA).length;

  return {
    total,
    libres,
    ocupadas,
    reservadas,
    pctLibres: ((libres / total) * 100).toFixed(1),
    pctOcupadas: ((ocupadas / total) * 100).toFixed(1),
    pctReservadas: ((reservadas / total) * 100).toFixed(1),
  };
}

export default {
  getMesas,
  getMesaByNumero,
  abrirPedidoMesa,
  agregarItemsPedido,
  enviarCocina,
  solicitarCuentaMesa,
  liberarMesa,
  getMinutosOcupada,
  getEstadisticasMesas,
};
