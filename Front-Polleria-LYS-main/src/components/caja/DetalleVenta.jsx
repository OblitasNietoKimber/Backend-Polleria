import { CheckCircle2, ReceiptText, UtensilsCrossed } from "lucide-react";
import cajaService from "../../services/cajaService";

export default function DetalleVenta({ pedido }) {
  if (!pedido) {
    return (
      <div className="caja-detail-empty">
        <span><ReceiptText size={30} /></span>
        <strong>Selecciona un pedido</strong>
        <p>Aquí verás los productos y podrás completar el cobro.</p>
      </div>
    );
  }

  const total = cajaService.calcularTotal(pedido);

  return (
    <div className="caja-detail">
      <div className="caja-detail-head">
        <div>
          <span className="caja-eyebrow">Detalle del pedido</span>
          <h2>{pedido.cliente}</h2>
          <p>{pedido.id}</p>
        </div>
        <span className={`caja-detail-status ${pedido.estado}`}>
          {pedido.estado === "pagado" ? <CheckCircle2 size={16} /> : null}
          {pedido.estado === "pagado" ? "Cobrado" : `Mesa ${pedido.mesa}`}
        </span>
      </div>

      <div className="caja-detail-items">
        {pedido.items.map((item, i) => (
          <div key={`${item.nombre}-${i}`} className="caja-detail-row">
            <span className="caja-product-icon"><UtensilsCrossed size={19} /></span>
            <span className="caja-product-name">
              <strong>{item.cantidad} × {item.nombre}</strong>
              <small>S/ {item.precio.toFixed(2)} c/u</small>
            </span>
            <strong className="font-mono">S/ {(item.cantidad * item.precio).toFixed(2)}</strong>
          </div>
        ))}
      </div>

      <div className="caja-total-row">
        <span>Total</span>
        <strong className="font-mono">S/ {total.toFixed(2)}</strong>
      </div>

      {pedido.estado === "pagado" && pedido.pago && (
        <div className="caja-paid-note">
          <CheckCircle2 size={18} />
          Pagado con {pedido.pago.metodo}
        </div>
      )}
    </div>
  );
}
