import { Check, Printer, X } from "lucide-react";

export default function TicketModal({ pedido, total, metodo, monto, vuelto, onClose }) {
  if (!pedido) return null;

  return (
    <div className="cart-backdrop open caja-modal-backdrop" onClick={onClose}>
      <section
        className="caja-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="caja-modal-close" onClick={onClose} aria-label="Cerrar comprobante">
          <X size={20} />
        </button>

        <header className="caja-modal-success">
          <span><Check size={28} strokeWidth={3} /></span>
          <p>Pago completado</p>
          <h2 id="ticket-title">¡Venta registrada!</h2>
          <small>{pedido.id} · Mesa {pedido.mesa}</small>
        </header>

        <div className="caja-receipt">
          {pedido.items.map((item, i) => (
            <div key={`${item.nombre}-${i}`}>
              <span>{item.cantidad} × {item.nombre}</span>
              <strong>S/ {(item.cantidad * item.precio).toFixed(2)}</strong>
            </div>
          ))}

          <div className="caja-receipt-total">
            <span>Total</span>
            <strong>S/ {total.toFixed(2)}</strong>
          </div>

          <dl>
            <div><dt>Método</dt><dd>{metodo}</dd></div>
            <div><dt>Recibido</dt><dd>S/ {monto.toFixed(2)}</dd></div>
            {metodo === "Efectivo" && <div><dt>Vuelto</dt><dd>S/ {vuelto.toFixed(2)}</dd></div>}
          </dl>
        </div>

        <div className="caja-modal-actions">
          <button type="button" className="caja-print-button" onClick={() => window.print()}>
            <Printer size={18} /> Imprimir
          </button>
          <button type="button" className="btn-ember" onClick={onClose}>Nueva venta</button>
        </div>
      </section>
    </div>
  );
}
