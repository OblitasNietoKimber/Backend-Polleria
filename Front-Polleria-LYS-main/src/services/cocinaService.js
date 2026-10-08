const STORAGE_KEY = "lys_pedidos"; // misma key que usa Caja

export const ESTADOS_COCINA = {
  NUEVO: "nuevo",
  EN_PREPARACION: "en_preparacion",
  LISTO: "listo",
  ENTREGADO: "entregado",
};

const seedPedidos = [];

function inicializar() {
  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return;
  }

  // Completa los campos faltantes de pedidos creados por módulos antiguos.
  const pedidos = JSON.parse(data);
  let pedidosCliente = [];
  try {
    pedidosCliente = JSON.parse(localStorage.getItem("lys-client-orders")) || [];
  } catch {
    pedidosCliente = [];
  }

  let necesitaMigrar = false;
  const migrados = pedidos.map((p) => {
    const cambios = {};
    if (!p.estadoCocina) cambios.estadoCocina = ESTADOS_COCINA.NUEVO;
    if (!p.estado) cambios.estado = p.estadoPago || "pendiente";
    if (!p.estadoPago) cambios.estadoPago = p.estado || "pendiente";
    if (!p.tipo) {
      const pedidoCliente = pedidosCliente.find((pedido) => pedido.id === p.id);
      cambios.tipo = p.mesa ? "salon" : pedidoCliente?.deliveryType || "salon";
    }

    if (Object.keys(cambios).length > 0) {
      necesitaMigrar = true;
      return { ...p, ...cambios };
    }
    return p;
  });
  if (necesitaMigrar) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrados));
  }
}

function getPedidos() {
  inicializar();
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function getPedidosPorEstado(estado) {
  return getPedidos()
    .filter((p) => p.estadoCocina === estado)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getPedidosActivos() {
  return getPedidos().filter((p) => p.estadoCocina !== ESTADOS_COCINA.ENTREGADO);
}

function getPedidosFinalizados() {
  return getPedidos()
    .filter((p) => p.estadoCocina === ESTADOS_COCINA.ENTREGADO)
    .sort((a, b) => new Date(b.finalizadoAt || b.createdAt) - new Date(a.finalizadoAt || a.createdAt));
}

function cambiarEstado(id, nuevoEstado) {
  const pedidos = getPedidos();
  const actualizados = pedidos.map((p) => {
    if (p.id !== id) return p;
    const cambios = { ...p, estadoCocina: nuevoEstado };
    if (nuevoEstado === ESTADOS_COCINA.ENTREGADO) {
      cambios.finalizadoAt = new Date().toISOString();
    }
    return cambios;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
  window.dispatchEvent(new CustomEvent("lys_pedidos_updated"));
  return actualizados.find((p) => p.id === id);
}

// Crea pedidos desde Mesas, Checkout web u otros módulos sin perder su tipo.
function crearPedido({
  id,
  mesa = null,
  cliente,
  items = [],
  observaciones = "",
  tipo = "salon",
  total,
} = {}) {
  const pedidos = getPedidos();
  const nuevoId = id || `PED-${1000 + pedidos.length + 1}`;
  const nuevoPedido = {
    id: nuevoId,
    mesa,
    cliente: cliente || (mesa ? `Mesa ${mesa}` : "Cliente"),
    tipo,
    estadoCocina: ESTADOS_COCINA.NUEVO,
    estado: "pendiente",
    estadoPago: "pendiente",
    observaciones,
    items,
    ...(total !== undefined ? { total } : {}),
    createdAt: new Date().toISOString(),
  };
  const existente = pedidos.findIndex((pedido) => pedido.id === nuevoId);
  const actualizados = [...pedidos];
  if (existente >= 0) actualizados[existente] = nuevoPedido;
  else actualizados.push(nuevoPedido);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
  window.dispatchEvent(new CustomEvent("lys_pedidos_updated"));
  return nuevoPedido;
}

export default {
  getPedidos,
  getPedidosPorEstado,
  getPedidosActivos,
  getPedidosFinalizados,
  cambiarEstado,
  crearPedido,
};
