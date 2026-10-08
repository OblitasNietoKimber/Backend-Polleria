const STORAGE_KEY = "lys_pedidos";

function inicializar() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return;
  }

  const pedidos = JSON.parse(data);
  let necesitaMigrar = false;
  const migrados = pedidos.map((pedido) => {
    const cambios = {};
    if (!pedido.estado) cambios.estado = pedido.estadoPago || "pendiente";
    if (!pedido.estadoPago) cambios.estadoPago = pedido.estado || "pendiente";
    if (!pedido.estadoCocina) cambios.estadoCocina = "nuevo";

    if (Object.keys(cambios).length > 0) {
      necesitaMigrar = true;
      return { ...pedido, ...cambios };
    }
    return pedido;
  });

  if (necesitaMigrar) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrados));
}

function getPedidos() {
  inicializar();
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function getPedidosPendientes() {
  return getPedidos().filter((p) => p.estado === "pendiente");
}

function getPedidoPorId(id) {
  return getPedidos().find((p) => p.id === id) || null;
}

function calcularTotal(pedido) {
  if (Number.isFinite(Number(pedido.total))) return Number(pedido.total);
  return pedido.items.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
}

function marcarComoPagado(id, dataPago) {
  const pedidos = getPedidos();
  const actualizados = pedidos.map((p) =>
    p.id === id
      ? { ...p, estado: "pagado", estadoPago: "pagado", pago: dataPago, pagadoAt: new Date().toISOString() }
      : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
  window.dispatchEvent(new CustomEvent("lys_pedidos_updated"));

  const pedidoPagado = actualizados.find((p) => p.id === id);
  if (pedidoPagado && pedidoPagado.mesa) {
    try {
      const rawMesas = localStorage.getItem("lys_mesas");
      if (rawMesas) {
        const mesas = JSON.parse(rawMesas);
        const mesaNum = String(pedidoPagado.mesa).padStart(2, "0");
        const mesasActualizadas = mesas.map((m) =>
          String(m.numero).padStart(2, "0") === mesaNum
            ? { ...m, estado: "libre", pedidoId: null, inicioAt: null, totalAcumulado: 0 }
            : m
        );
        localStorage.setItem("lys_mesas", JSON.stringify(mesasActualizadas));
        window.dispatchEvent(new Event("lys_mesas_updated"));
      }
    } catch (e) {
      console.error("Error al liberar mesa tras pago:", e);
    }
  }

  return pedidoPagado;
}

function getVentas() {
  return getPedidos().filter((p) => p.estado === "pagado");
}

function getFechaVenta(venta) {
  return new Date(venta.pagadoAt || venta.createdAt);
}

function formatearFechaLocal(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inicioDelDia(fecha) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function finDelDia(fecha) {
  const copia = new Date(fecha);
  copia.setHours(23, 59, 59, 999);
  return copia;
}

function parsearFechaFiltro(fecha) {
  if (fecha instanceof Date) return fecha;
  if (typeof fecha !== "string") return new Date(fecha);

  const partes = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return new Date(fecha);

  const [, year, month, day] = partes;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function filtrarVentasPorFecha(ventas, fechaInicio, fechaFin) {
  if (!fechaInicio && !fechaFin) return ventas;

  const inicio = fechaInicio ? inicioDelDia(parsearFechaFiltro(fechaInicio)) : null;
  const fin = fechaFin ? finDelDia(parsearFechaFiltro(fechaFin)) : null;

  return ventas.filter((venta) => {
    const fecha = getFechaVenta(venta);
    return (!inicio || fecha >= inicio) && (!fin || fecha <= fin);
  });
}

function crearResumen(ventas) {
  return {
    cantidadPedidos: ventas.length,
    totalVentas: ventas.reduce((acc, venta) => acc + calcularTotal(venta), 0),
  };
}

function getResumenVentas(filtros = {}) {
  const ventas = getVentasFiltradas(filtros);
  const ahora = new Date();

  const inicioSemana = inicioDelDia(new Date(ahora));
  inicioSemana.setDate(inicioSemana.getDate() - 6);

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  return {
    dia: crearResumen(filtrarVentasPorFecha(ventas, inicioDelDia(ahora), finDelDia(ahora))),
    semana: crearResumen(filtrarVentasPorFecha(ventas, inicioSemana, finDelDia(ahora))),
    mes: crearResumen(filtrarVentasPorFecha(ventas, inicioMes, finDelDia(ahora))),
    total: crearResumen(ventas),
  };
}

function getVentasFiltradas(filtros = {}) {
  return filtrarVentasPorFecha(getVentas(), filtros.fechaInicio, filtros.fechaFin);
}

function getProductosMasVendidos(filtros = {}) {
  const productos = new Map();

  getVentasFiltradas(filtros).forEach((venta) => {
    venta.items.forEach((item) => {
      const actual = productos.get(item.nombre) || {
        productoId: item.id,
        nombre: item.nombre,
        imagen: item.imagen,
        cantidad: 0,
        total: 0,
      };

      productos.set(item.nombre, {
        ...actual,
        productoId: actual.productoId || item.id,
        imagen: actual.imagen || item.imagen,
        cantidad: actual.cantidad + item.cantidad,
        total: actual.total + item.cantidad * item.precio,
      });
    });
  });

  return Array.from(productos.values()).sort((a, b) => b.cantidad - a.cantidad);
}

function getVentasPorMetodoPago(filtros = {}) {
  const metodos = new Map();

  getVentasFiltradas(filtros).forEach((venta) => {
    const metodo = venta.pago?.metodo || "Sin metodo";
    const actual = metodos.get(metodo) || {
      nombre: metodo,
      cantidad: 0,
      total: 0,
    };

    metodos.set(metodo, {
      ...actual,
      cantidad: actual.cantidad + 1,
      total: actual.total + calcularTotal(venta),
    });
  });

  return Array.from(metodos.values()).sort((a, b) => b.total - a.total);
}

function getVentasPorDia(filtros = {}) {
  const dias = new Map();

  getVentasFiltradas(filtros).forEach((venta) => {
    const fecha = formatearFechaLocal(getFechaVenta(venta));
    const actual = dias.get(fecha) || {
      fecha,
      cantidad: 0,
      total: 0,
    };

    dias.set(fecha, {
      ...actual,
      cantidad: actual.cantidad + 1,
      total: actual.total + calcularTotal(venta),
    });
  });

  return Array.from(dias.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function crearRangoDias(cantidad, fechaFin = new Date()) {
  return Array.from({ length: cantidad }, (_, index) => {
    const fecha = inicioDelDia(new Date(fechaFin));
    fecha.setDate(fecha.getDate() - (cantidad - 1 - index));
    return formatearFechaLocal(fecha);
  });
}

function completarVentasPorDia(ventas, dias) {
  const agrupadas = new Map(dias.map((fecha) => [fecha, { fecha, cantidad: 0, total: 0 }]));

  ventas.forEach((venta) => {
    const fecha = formatearFechaLocal(getFechaVenta(venta));
    const actual = agrupadas.get(fecha);
    if (!actual) return;

    agrupadas.set(fecha, {
      fecha,
      cantidad: actual.cantidad + 1,
      total: actual.total + calcularTotal(venta),
    });
  });

  return dias.map((fecha) => agrupadas.get(fecha));
}

function crearTendencia(labels, values) {
  return { labels, values };
}

function inicioDeSemana(fecha) {
  const copia = inicioDelDia(fecha);
  const dia = copia.getDay();
  const diferenciaLunes = dia === 0 ? -6 : 1 - dia;
  copia.setDate(copia.getDate() + diferenciaLunes);
  return copia;
}

function getTendenciasResumen() {
  const ventas = getVentas();
  const ahora = new Date();
  const inicioHoy = inicioDelDia(ahora);
  const finHoy = finDelDia(ahora);
  const inicioSemanaActual = inicioDeSemana(ahora);
  const diasSemana = crearRangoDias(7, new Date(inicioSemanaActual.getFullYear(), inicioSemanaActual.getMonth(), inicioSemanaActual.getDate() + 6));
  const inicioMes = inicioDelDia(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  const finMes = finDelDia(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0));

  const horasHoy = Array.from({ length: 25 }, (_, index) => index);
  const ventasHoy = filtrarVentasPorFecha(ventas, inicioHoy, finHoy);
  const dia = horasHoy.map((hora) =>
    ventasHoy
      .filter((venta) => getFechaVenta(venta).getHours() === hora)
      .reduce((acc, venta) => acc + calcularTotal(venta), 0)
  );

  const semana = completarVentasPorDia(ventas, diasSemana).map((diaVenta) => diaVenta.total);

  const diasMes = [];
  const cursorMes = inicioDelDia(inicioMes);
  while (cursorMes <= finMes) {
    diasMes.push(formatearFechaLocal(cursorMes));
    cursorMes.setDate(cursorMes.getDate() + 1);
  }

  const mes = completarVentasPorDia(ventas, diasMes).map((diaVenta) => diaVenta.total);
  const meses = Array.from({ length: 12 }, (_, index) => index);
  const total = meses.map((mesIndex) =>
    ventas
      .filter((venta) => {
        const fecha = getFechaVenta(venta);
        return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === mesIndex;
      })
      .reduce((acc, venta) => acc + calcularTotal(venta), 0)
  );

  return {
    dia: crearTendencia(horasHoy.map((hora) => `${hora}h`), dia),
    semana: crearTendencia(["lun", "mar", "mie", "jue", "vie", "sab", "dom"], semana),
    mes: crearTendencia(diasMes.map((fecha) => String(new Date(`${fecha}T00:00:00`).getDate())), mes),
    total: crearTendencia(["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], total),
  };
}

function getMetricasOperativasPorDia() {
  const pedidos = getPedidos();
  const dias = crearRangoDias(5);
  const agrupadas = new Map(
    dias.map((fecha) => [
      fecha,
      { fecha, completados: 0, pendientes: 0, cancelados: 0, ventas: 0 },
    ])
  );

  pedidos.forEach((pedido) => {
    const fechaBase = pedido.pagadoAt || pedido.createdAt;
    const fecha = formatearFechaLocal(new Date(fechaBase));
    const actual = agrupadas.get(fecha);
    if (!actual) return;

    const estado = String(pedido.estado || "").toLowerCase();
    if (estado === "pagado") {
      actual.completados += 1;
      actual.ventas += calcularTotal(pedido);
    } else if (estado === "pendiente") {
      actual.pendientes += 1;
    } else if (estado === "cancelado" || estado === "anulado") {
      actual.cancelados += 1;
    }
  });

  const datos = dias.map((fecha) => agrupadas.get(fecha));
  const labels = dias.map((fecha) =>
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
  );

  return {
    labels,
    completados: datos.map((dia) => dia.completados),
    pendientes: datos.map((dia) => dia.pendientes),
    cancelados: datos.map((dia) => dia.cancelados),
    ventas: datos.map((dia) => dia.ventas),
  };
}

function getHistorialVentas(filtros = {}) {
  return getVentasFiltradas(filtros)
    .map((venta) => ({
      ...venta,
      total: calcularTotal(venta),
    }))
    .sort((a, b) => getFechaVenta(b) - getFechaVenta(a));
}

export default {
  getPedidos,
  getPedidosPendientes,
  getPedidoPorId,
  calcularTotal,
  marcarComoPagado,
  getVentas,
  getResumenVentas,
  getVentasFiltradas,
  getProductosMasVendidos,
  getVentasPorMetodoPago,
  getVentasPorDia,
  getTendenciasResumen,
  getMetricasOperativasPorDia,
  getHistorialVentas,
};
