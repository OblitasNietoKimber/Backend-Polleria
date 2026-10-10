import { Clock, CheckCircle2, Play, ChefHat } from "lucide-react";
import { useTiempoTranscurrido } from "../../hooks/useTiempoTranscurrido";

const ESTADO_CLASE = {
  nuevo: "cocina-card--nuevo",
  en_preparacion: "cocina-card--preparacion",
  listo: "cocina-card--listo",
};

const TIPO_LABEL = {
  salon: "Salón",
  delivery: "Delivery",
  recojo: "Para llevar",
};

export default function TarjetaPedidoCocina({ pedido, onCambiarEstado, actualizando = false }) {
  const { texto: tiempo } = useTiempoTranscurrido(pedido.createdAt, pedido.finalizadoAt);
  const tipo = pedido.tipo || "salon";

  return (
    <div className={`cocina-card ${ESTADO_CLASE[pedido.estadoCocina] || ""}`}>
      <div className="cocina-card-top">
        <span className="cocina-codigo">{pedido.id}</span>
        <div className="cocina-card-top-right">
          {pedido.mesa && <span className="cocina-mesa-texto">Mesa {pedido.mesa}</span>}
          <span className={`cocina-tipo-badge cocina-tipo-badge--${tipo}`}>
            {TIPO_LABEL[tipo] || "Salón"}
          </span>
        </div>
      </div>

      <div className="cocina-timer">
        <Clock size={13} /> {tiempo}
      </div>

      {pedido.observaciones && <p className="cocina-obs-general">Obs: {pedido.observaciones}</p>}

      <ul className="cocina-items">
        {pedido.items.map((item, i) => (
          <li key={i}>
            <span className="cocina-cant">{item.cantidad}x</span>
            <span>
              {item.nombre}
              {item.observacion && <span className="cocina-obs-item"> — {item.observacion}</span>}
            </span>
          </li>
        ))}
      </ul>

      {pedido.cambiadoEn && <p className="cocina-auditoria">Último cambio: {new Date(pedido.cambiadoEn).toLocaleString('es-PE')} · Usuario: {pedido.cambiadoPor || 'Sin registro'}</p>}
      {pedido.estadoCocina === "listo" && pedido.tipo === "delivery" && <p className="cocina-auditoria">Listo para reparto</p>}
      {pedido.estadoCocina === "nuevo" && (
        <button className="cocina-btn cocina-btn--iniciar" disabled={actualizando} onClick={() => onCambiarEstado(pedido, "en_preparacion")}>
          <Play size={14} /> Comenzar
        </button>
      )}
      {pedido.estadoCocina === "en_preparacion" && (
        <button className="cocina-btn cocina-btn--listo" disabled={actualizando} onClick={() => onCambiarEstado(pedido, "listo")}>
          <ChefHat size={14} /> Marcar listo
        </button>
      )}
      {pedido.estadoCocina === "listo" && pedido.tipo !== "delivery" && (
        <button className="cocina-btn cocina-btn--entregar" disabled={actualizando} onClick={() => onCambiarEstado(pedido, "entregado")}>
          <CheckCircle2 size={14} /> Entregar
        </button>
      )}
    </div>
  );
}