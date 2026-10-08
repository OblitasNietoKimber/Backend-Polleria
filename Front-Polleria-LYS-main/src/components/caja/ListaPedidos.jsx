import { ChevronRight, ReceiptText } from "lucide-react";
import cajaService from "../../services/cajaService";

export default function ListaPedidos({ pedidos, pedidoSeleccionado, onSeleccionar }) {
  if (pedidos.length === 0) {
    return (
      <div className="caja-empty-state">
        <ReceiptText size={28} />
        <strong>No encontramos pedidos</strong>
        <span>Prueba con otro número de pedido o mesa.</span>
      </div>
    );
  }

  return (
    <div className="caja-list">
      {pedidos.map((pedido) => {
        const cantidad = pedido.items.reduce((total, item) => total + item.cantidad, 0);
        const total = cajaService.calcularTotal(pedido);
        const seleccionado = pedidoSeleccionado === pedido.id;

        return (
          <button
            type="button"
            key={pedido.id}
            className={`caja-item ${seleccionado ? "caja-item-selected" : ""}`}
            onClick={() => onSeleccionar(pedido.id)}
            aria-pressed={seleccionado}
          >
            <span className="caja-table-icon" aria-hidden="true">{pedido.mesa}</span>
            <span className="caja-item-meta">
              <strong>{pedido.cliente}</strong>
              <small>{pedido.id} · {cantidad} {cantidad === 1 ? "producto" : "productos"}</small>
            </span>
            <span className="caja-item-amount">S/ {total.toFixed(2)}</span>
            <span className={`caja-status ${pedido.estado}`}>
              {pedido.estado === "pagado" ? "Cobrado" : "Por cobrar"}
            </span>
            <ChevronRight className="caja-item-arrow" size={20} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
