import { SEED_MESAS, SEED_ACTIVIDADES, ESTADOS_MESA } from '../data/mesasData';

const MESAS_KEY = 'lys_mesas';
const ACTIVIDADES_KEY = 'lys_actividades';
const PEDIDOS_KEY = 'lys_pedidos';

function inicializar() {
  if (typeof window === 'undefined') return;

  const dataMesas = localStorage.getItem(MESAS_KEY);
  if (!dataMesas) {
    localStorage.setItem(MESAS_KEY, JSON.stringify(SEED_MESAS));
  } else {
    try {
      const mesas = JSON.parse(dataMesas);
      const zonasDef = { '11': 'terraza', '12': 'terraza', '13': 'terraza', '14': 'terraza', '15': 'segundo_piso', '16': 'segundo_piso' };
      const tiemposDemo = { '03': 25, '05': 41, '10': 15, '13': 55, '15': 35 };
      const ahora = Date.now();
      let huboCambio = false;

      const actualizadas = mesas.map((m) => {
        let mesaModificada = { ...m };

        // Asegurar asignación de zonas
        if (zonasDef[m.numero] && m.zona === 'salon_principal') {
          huboCambio = true;
          mesaModificada.zona = zonasDef[m.numero];
        }

        // Auto-reparar timestamps antiguos guardados hace días en localStorage
        if (mesaModificada.estado === ESTADOS_MESA.OCUPADA && mesaModificada.inicioAt) {
          const diffMin = (ahora - new Date(mesaModificada.inicioAt).getTime()) / 60000;
          // Si el timestamp tiene más de 3 horas (180 min) o es del pasado lejano por días
          if (diffMin > 180 || diffMin < 0) {
            huboCambio = true;
            const minSimulados = tiemposDemo[mesaModificada.numero] || 20;
            mesaModificada.inicioAt = new Date(ahora - minSimulados * 60000).toISOString();
          }
        }

        return mesaModificada;
      });

      if (huboCambio) {
        localStorage.setItem(MESAS_KEY, JSON.stringify(actualizadas));
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  if (!localStorage.getItem(ACTIVIDADES_KEY)) {
    localStorage.setItem(ACTIVIDADES_KEY, JSON.stringify(SEED_ACTIVIDADES));
  }
}

function getMesasRaw() {
  inicializar();
  try {
    const data = localStorage.getItem(MESAS_KEY);
    return data ? JSON.parse(data) : SEED_MESAS;
  } catch (error) {
    console.error('Error al leer mesas:', error);
    return SEED_MESAS;
  }
}

function saveMesas(mesas) {
  try {
    localStorage.setItem(MESAS_KEY, JSON.stringify(mesas));
    // Disparar evento para sincronización local inmediata
    window.dispatchEvent(new Event('lys_mesas_updated'));
  } catch (error) {
    console.error('Error al guardar mesas:', error);
  }
}

/**
 * Retorna las mesas sincronizadas con los pedidos actuales de lys_pedidos.
 * Si un pedido asociado está pagado, la mesa puede liberarse automáticamente o reflejar el estado actual.
 */
export function getMesas() {
  const mesas = getMesasRaw();
  let pedidos = [];

  try {
    const rawPedidos = localStorage.getItem(PEDIDOS_KEY);
    pedidos = rawPedidos ? JSON.parse(rawPedidos) : [];
  } catch {
    pedidos = [];
  }

  // Sincronizar montos y estados en vivo con lys_pedidos
  let huboCambios = false;
  const mesasSincronizadas = mesas.map((m) => {
    if (m.estado === ESTADOS_MESA.OCUPADA && m.pedidoId) {
      const pedido = pedidos.find((p) => p.id === m.pedidoId);
      if (pedido) {
        // Calcular total actual del pedido
        const total = pedido.items?.reduce((acc, it) => acc + (it.cantidad * it.precio), 0) || 0;
        if (total > 0 && total !== m.totalAcumulado) {
          huboCambios = true;
          return { ...m, totalAcumulado: total };
        }
      }
    }
    return m;
  });

  if (huboCambios) {
    saveMesas(mesasSincronizadas);
  }

  return mesasSincronizadas;
}

export function getMesaById(id) {
  const mesas = getMesas();
  return mesas.find((m) => m.id === Number(id)) || null;
}

export function getMesaByNumero(numero) {
  const mesas = getMesas();
  const numNormalizado = String(numero).padStart(2, '0');
  return mesas.find((m) => String(m.numero).padStart(2, '0') === numNormalizado) || null;
}

export function ocuparMesa(numero, pedidoId, total = 0) {
  const mesas = getMesas();
  const numNormalizado = String(numero).padStart(2, '0');

  const actualizadas = mesas.map((m) => {
    if (String(m.numero).padStart(2, '0') === numNormalizado) {
      return {
        ...m,
        estado: ESTADOS_MESA.OCUPADA,
        pedidoId,
        inicioAt: new Date().toISOString(),
        totalAcumulado: total,
        horaReserva: null,
        clienteReserva: null,
        telefonoReserva: null,
        comensalesReserva: null,
      };
    }
    return m;
  });

  saveMesas(actualizadas);
  return actualizadas.find((m) => String(m.numero).padStart(2, '0') === numNormalizado);
}

export function liberarMesa(numero) {
  const mesas = getMesas();
  const numNormalizado = String(numero).padStart(2, '0');

  const actualizadas = mesas.map((m) => {
    if (String(m.numero).padStart(2, '0') === numNormalizado) {
      return {
        ...m,
        estado: ESTADOS_MESA.LIBRE,
        pedidoId: null,
        inicioAt: null,
        totalAcumulado: 0,
        horaReserva: null,
        clienteReserva: null,
        telefonoReserva: null,
        comensalesReserva: null,
      };
    }
    return m;
  });

  saveMesas(actualizadas);
  return actualizadas.find((m) => String(m.numero).padStart(2, '0') === numNormalizado);
}

export function reservarMesa(numero, { cliente, hora, comensales, telefono } = {}) {
  const mesas = getMesas();
  const numNormalizado = String(numero).padStart(2, '0');

  const actualizadas = mesas.map((m) => {
    if (String(m.numero).padStart(2, '0') === numNormalizado) {
      return {
        ...m,
        estado: ESTADOS_MESA.RESERVADA,
        horaReserva: hora || '20:00',
        clienteReserva: (cliente || 'Cliente Reserva').trim(),
        telefonoReserva: (telefono || '').trim(),
        comensalesReserva: Number(comensales) || m.capacidad,
      };
    }
    return m;
  });

  saveMesas(actualizadas);
  return actualizadas.find((m) => String(m.numero).padStart(2, '0') === numNormalizado);
}

export function getEstadisticasMesas(zona = 'salon_principal') {
  const mesas = getMesas().filter((m) => !zona || m.zona === zona);
  const total = mesas.length || 1;

  const libres = mesas.filter((m) => m.estado === ESTADOS_MESA.LIBRE).length;
  const ocupadas = mesas.filter((m) => m.estado === ESTADOS_MESA.OCUPADA).length;
  const reservadas = mesas.filter((m) => m.estado === ESTADOS_MESA.RESERVADA).length;

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

export function getActividades() {
  inicializar();
  try {
    const raw = localStorage.getItem(ACTIVIDADES_KEY);
    return raw ? JSON.parse(raw) : SEED_ACTIVIDADES;
  } catch {
    return SEED_ACTIVIDADES;
  }
}

export function registrarActividad({ mesaNumero, tipo, titulo, descripcion, ordenCodigo, tipoColor }) {
  const actividades = getActividades();
  const ahora = new Date();
  const horaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const nuevaActividad = {
    id: `ACT-${Date.now()}`,
    mesaNumero: String(mesaNumero).padStart(2, '0'),
    tipo: tipo || 'pedido_creado',
    titulo: titulo || `Mesa ${String(mesaNumero).padStart(2, '0')}`,
    descripcion: descripcion || 'Pedido actualizado',
    ordenCodigo: ordenCodigo || '',
    hora: horaStr,
    tipoColor: tipoColor || 'rojo',
    createdAt: ahora.toISOString(),
  };

  const listaActualizada = [nuevaActividad, ...actividades].slice(0, 20); // guardar últimas 20
  localStorage.setItem(ACTIVIDADES_KEY, JSON.stringify(listaActualizada));
  window.dispatchEvent(new Event('lys_actividades_updated'));
  return nuevaActividad;
}

export function getMinutosOcupada(inicioAt) {
  if (!inicioAt) return 0;
  const diffMs = Date.now() - new Date(inicioAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  // Si supera 3 horas por timestamps desfasados en localStorage, acotar a un tiempo de consumo realista
  if (mins > 180) return 35;
  return mins;
}

export default {
  getMesas,
  getMesaById,
  getMesaByNumero,
  ocuparMesa,
  liberarMesa,
  reservarMesa,
  getEstadisticasMesas,
  getActividades,
  registrarActividad,
  getMinutosOcupada,
};

