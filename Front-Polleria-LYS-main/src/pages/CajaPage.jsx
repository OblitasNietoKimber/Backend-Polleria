import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import cajaService from "../services/pagoService";
import ListaPedidos from "../components/caja/ListaPedidos";
import BuscadorPedidos from "../components/caja/BuscadorPedidos";
import DetalleVenta from "../components/caja/DetalleVenta";
import FormularioPago from "../components/caja/FormularioPago";
import TicketModal from "../components/caja/TicketModal";
import fondo from "../img/fondo.png";

export default function CajaPage() {
  const [pedidos, setPedidos] = useState([]);
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("pendientes");
  const [metodo, setMetodo] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [ventaConfirmada, setVentaConfirmada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [reintentoPendiente, setReintentoPendiente] = useState(false);
  const intento = useRef(null);
  const bloqueo = useRef(false);
  const montado = useRef(false);
  const consulta = useRef(0);

  const recargar = useCallback(async () => {
    if (bloqueo.current) return;
    const version = ++consulta.current;
    try {
      const data = await cajaService.getPedidos();
      if (!montado.current || version !== consulta.current || bloqueo.current) return;
      setPedidos(data);
      setSeleccionadoId(actual => data.some(p => p.id === actual) ? actual : data.find(p => p.estado === "pendiente" && p.total > 0)?.id ?? null);
      setError("");
    } catch (err) {
      if (montado.current && version === consulta.current) setError(err.message || "No se pudieron consultar los pedidos.");
    } finally {
      if (montado.current && version === consulta.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    const inicial = setTimeout(recargar, 0);
    const timer = setInterval(() => {
      if (!intento.current) recargar();
    }, 10000);
    return () => { montado.current = false; clearTimeout(inicial); clearInterval(timer); };
  }, [recargar]);

  const pendientes = pedidos.filter((pedido) => pedido.estado === "pendiente" && pedido.total > 0);
  const cobrados = pedidos.filter((pedido) => pedido.estado === "pagado");
  const listaActiva = vista === "pendientes" ? pendientes : cobrados;

  const pedidosFiltrados = listaActiva.filter((pedido) =>
    `${pedido.codigo} ${pedido.mesa || pedido.tipo} ${pedido.cliente}`
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase())
  );

  const pedidoActivo = pedidos.find((pedido) => pedido.id === seleccionadoId) ?? null;
  const total = pedidoActivo ? cajaService.calcularTotal(pedidoActivo) : 0;
  const montoNumerico = Number(monto);
  const montoValido = monto !== "" && /^\d+(\.\d{1,2})?$/.test(monto) && Number.isFinite(montoNumerico) && montoNumerico > 0;
  const puedeCobrar = Boolean(
    pedidoActivo &&
      pedidoActivo.estado === "pendiente" && total > 0 && !cargando && !cobrando &&
      (metodo !== "Efectivo" || (montoValido && montoNumerico >= total))
  );

  const resumen = useMemo(() => {
    const ventasHoy = cobrados.filter((pedido) => {
      if (!pedido.pagadoAt) return false;
      return new Date(pedido.pagadoAt).toDateString() === new Date().toDateString();
    });

    return {
      ventas: ventasHoy.reduce((suma, pedido) => suma + cajaService.calcularTotal(pedido), 0),
      cobrados: ventasHoy.length,
      porCobrar: pendientes.reduce((suma, pedido) => suma + cajaService.calcularTotal(pedido), 0),
    };
  }, [cobrados, pendientes]);

  function cambiarVista(nuevaVista) {
    if (bloqueo.current || intento.current) return;
    const nuevaLista = nuevaVista === "pendientes" ? pendientes : cobrados;
    setVista(nuevaVista);
    setBusqueda("");
    setSeleccionadoId(nuevaLista[0]?.id ?? null);
    setMonto("");
  }

  function cambiarMetodo(nuevoMetodo) {
    if (bloqueo.current || intento.current) return;
    setMetodo(nuevoMetodo);
    setMonto(nuevoMetodo === "Efectivo" ? "" : total.toFixed(2));
  }

  async function confirmarVenta() {
    if (!puedeCobrar || bloqueo.current) return;
    bloqueo.current = true;
    ++consulta.current;
    setCobrando(true);
    setError("");
    intento.current ??= { id: seleccionadoId, data: {
      metodo, monto: metodo === "Efectivo" ? montoNumerico : total,
      idempotencia: crypto.randomUUID(), totalEsperado: total,
    } };
    try {
      const pedidoPagado = await cajaService.registrarCobro(intento.current.id, intento.current.data);
      if (!montado.current) return;
      setPedidos(actual => actual.map(p => p.id === pedidoPagado.id ? pedidoPagado : p));
      setVentaConfirmada(pedidoPagado);
      intento.current = null;
      setReintentoPendiente(false);
    } catch (err) {
      if (montado.current) {
        setError(err.message || "No se pudo confirmar el cobro. Reintenta para consultar su resultado.");
        setReintentoPendiente(true);
      }
    } finally {
      bloqueo.current = false;
      if (montado.current) setCobrando(false);
    }
  }

  function cerrarTicket() {
    const primerPendiente = pendientes[0];
    setVentaConfirmada(null);
    setVista("pendientes");
    setSeleccionadoId(primerPendiente?.id ?? null);
    setMonto("");
    setMetodo("Efectivo");
    recargar();
  }

  async function revisarCuenta() {
    if (bloqueo.current) return;
    intento.current = null;
    setReintentoPendiente(false);
    setMonto("");
    setCargando(true);
    await recargar();
  }

  return (
    <div className="lys-root admin-screen caja-page">
      <main className="caja-main">
        <section className="caja-intro" aria-labelledby="caja-title">
          <div className="caja-heading">
            <div className="caja-title-row">
              <h1 id="caja-title" className="caja-title font-display">Caja</h1>
              <span className="caja-open-badge">
                <span aria-hidden="true" />
                Caja abierta
              </span>
            </div>
            <p>Gestiona tus cobros de forma rápida y sencilla.</p>
          </div>

          <div className="caja-banner">
            <div className="caja-banner-copy">
              <span>El sabor de siempre</span>
              <strong>Un buen servicio termina con un cobro perfecto.</strong>
            </div>
            <img src={fondo} alt="Pollo a la brasa con papas" />
          </div>
        </section>

        <section className="caja-summary" aria-label="Resumen de caja">
          <article className="caja-summary-card">
            <span className="caja-summary-icon red"><Banknote size={22} /></span>
            <div><p>Ventas del día</p><strong>S/ {resumen.ventas.toFixed(2)}</strong></div>
          </article>
          <article className="caja-summary-card">
            <span className="caja-summary-icon gold"><CheckCircle2 size={22} /></span>
            <div><p>Pedidos cobrados</p><strong>{resumen.cobrados}</strong></div>
          </article>
          <article className="caja-summary-card">
            <span className="caja-summary-icon dark"><Clock3 size={22} /></span>
            <div><p>Por cobrar</p><strong>S/ {resumen.porCobrar.toFixed(2)}</strong></div>
          </article>
        </section>

        {cargando && <p role="status">Consultando pedidos…</p>}
        {error && <div role="alert" className="caja-error">{error}</div>}
        <button type="button" className="caja-refresh-button" disabled={cobrando || cargando} onClick={revisarCuenta}>
          {reintentoPendiente ? "Actualizar y revisar el resultado" : "Actualizar pedidos"}
        </button>
        <div className="caja-layout" aria-busy={cargando || cobrando}>
          <section className="caja-orders-panel" aria-labelledby="pedidos-title">
            <div className="caja-section-title">
              <div>
                <span className="caja-eyebrow">Atención en salón</span>
                <h2 id="pedidos-title">Pedidos</h2>
              </div>
              <ShoppingBag size={21} aria-hidden="true" />
            </div>

            <BuscadorPedidos valor={busqueda} onChange={setBusqueda} />

            <div className="caja-tabs" role="tablist" aria-label="Estado de pedidos">
              <button
                type="button"
                role="tab"
                aria-selected={vista === "pendientes"}
                className={vista === "pendientes" ? "active" : ""}
                disabled={cobrando || reintentoPendiente}
                onClick={() => cambiarVista("pendientes")}
              >
                Pendientes <span>{pendientes.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === "cobrados"}
                className={vista === "cobrados" ? "active" : ""}
                disabled={cobrando || reintentoPendiente}
                onClick={() => cambiarVista("cobrados")}
              >
                Cobrados <span>{cobrados.length}</span>
              </button>
            </div>

            <ListaPedidos
              pedidos={pedidosFiltrados}
              pedidoSeleccionado={seleccionadoId}
              disabled={cobrando || reintentoPendiente}
              onSeleccionar={(id) => {
                setSeleccionadoId(id);
                setMonto("");
                setMetodo("Efectivo");
              }}
            />
          </section>

          <section className="caja-payment-panel" aria-label="Cobro del pedido">
            <DetalleVenta pedido={pedidoActivo} />

            {pedidoActivo?.estado === "pendiente" && (
              <>
                <FormularioPago
                  metodo={metodo}
                  onMetodoChange={cambiarMetodo}
                  monto={monto}
                  onMontoChange={setMonto}
                  total={total}
                  disabled={cobrando || reintentoPendiente}
                />

                {metodo === "Efectivo" && montoValido && (
                  <div className={`caja-change ${montoNumerico < total ? "insufficient" : ""}`}>
                    <span>{montoNumerico < total ? "Monto pendiente" : "Vuelto estimado"}</span>
                    <strong className="font-mono">
                      S/ {Math.abs(montoNumerico - total).toFixed(2)}
                    </strong>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-ember caja-confirm-button"
                  disabled={!puedeCobrar}
                  onClick={confirmarVenta}
                >
                  <CheckCircle2 size={19} />
                  {cobrando ? "Confirmando cobro…" : reintentoPendiente ? "Reintentar el mismo cobro" : `Cobrar S/ ${total.toFixed(2)}`}
                </button>
              </>
            )}
          </section>
        </div>

        {ventaConfirmada && (
          <TicketModal
            pedido={ventaConfirmada}
            total={cajaService.calcularTotal(ventaConfirmada)}
            metodo={ventaConfirmada.pago.metodo}
            monto={ventaConfirmada.pago.monto}
            vuelto={ventaConfirmada.pago.vuelto}
            onClose={cerrarTicket}
          />
        )}
      </main>
    </div>
  );
}
