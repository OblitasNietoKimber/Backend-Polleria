import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import cajaService from "../services/cajaService";
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

  useEffect(() => {
    const pedidosGuardados = cajaService.getPedidos();
    const primerPendiente = pedidosGuardados.find((pedido) => pedido.estado === "pendiente");
    setPedidos(pedidosGuardados);
    setSeleccionadoId(primerPendiente?.id ?? null);
  }, []);

  const pendientes = pedidos.filter((pedido) => pedido.estado === "pendiente");
  const cobrados = pedidos.filter((pedido) => pedido.estado === "pagado");
  const listaActiva = vista === "pendientes" ? pendientes : cobrados;

  const pedidosFiltrados = listaActiva.filter((pedido) =>
    `${pedido.id} ${pedido.mesa} ${pedido.cliente}`
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase())
  );

  const pedidoActivo = pedidos.find((pedido) => pedido.id === seleccionadoId) ?? null;
  const total = pedidoActivo ? cajaService.calcularTotal(pedidoActivo) : 0;
  const montoNumerico = Number.parseFloat(monto) || 0;
  const vuelto = metodo === "Efectivo" ? Math.max(0, montoNumerico - total) : 0;
  const puedeCobrar = Boolean(
    pedidoActivo &&
      pedidoActivo.estado === "pendiente" &&
      (metodo !== "Efectivo" || montoNumerico >= total)
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
  }, [pedidos]);

  function cambiarVista(nuevaVista) {
    const nuevaLista = nuevaVista === "pendientes" ? pendientes : cobrados;
    setVista(nuevaVista);
    setBusqueda("");
    setSeleccionadoId(nuevaLista[0]?.id ?? null);
    setMonto("");
  }

  function cambiarMetodo(nuevoMetodo) {
    setMetodo(nuevoMetodo);
    setMonto(nuevoMetodo === "Efectivo" ? "" : total.toFixed(2));
  }

  function confirmarVenta() {
    if (!puedeCobrar) return;

    const pedidoPagado = cajaService.marcarComoPagado(seleccionadoId, {
      metodo,
      monto: metodo === "Efectivo" ? montoNumerico : total,
      vuelto,
    });

    setVentaConfirmada(pedidoPagado);
  }

  function cerrarTicket() {
    const pedidosActualizados = cajaService.getPedidos();
    const primerPendiente = pedidosActualizados.find((pedido) => pedido.estado === "pendiente");
    setVentaConfirmada(null);
    setPedidos(pedidosActualizados);
    setVista("pendientes");
    setSeleccionadoId(primerPendiente?.id ?? null);
    setMonto("");
    setMetodo("Efectivo");
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

        <div className="caja-layout">
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
                onClick={() => cambiarVista("pendientes")}
              >
                Pendientes <span>{pendientes.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === "cobrados"}
                className={vista === "cobrados" ? "active" : ""}
                onClick={() => cambiarVista("cobrados")}
              >
                Cobrados <span>{cobrados.length}</span>
              </button>
            </div>

            <ListaPedidos
              pedidos={pedidosFiltrados}
              pedidoSeleccionado={seleccionadoId}
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
                />

                {metodo === "Efectivo" && monto && (
                  <div className={`caja-change ${montoNumerico < total ? "insufficient" : ""}`}>
                    <span>{montoNumerico < total ? "Monto pendiente" : "Vuelto"}</span>
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
                  Cobrar S/ {total.toFixed(2)}
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
