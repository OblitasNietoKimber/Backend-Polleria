import { useTiempoTranscurrido } from "../../hooks/useTiempoTranscurrido";

function FilaPedido({ pedido }) {
  const { texto: duracion } = useTiempoTranscurrido(pedido.createdAt, pedido.finalizadoAt);

  return (
    <div className="cocina-finalizado-item">
      <div>
        <span className="cocina-finalizado-id">{pedido.id}</span>
        <span className="cocina-id cocina-finalizado-cliente">{pedido.cliente}</span>
      </div>
      <div className="cocina-finalizado-meta">
        <span className="font-mono cocina-finalizado-duracion">Preparación: {duracion}</span>
        <span className="font-mono cocina-finalizado-hora">
          {new Date(pedido.finalizadoAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default function PedidosFinalizados({ pedidos }) {
  if (pedidos.length === 0) {
    return <p className="cocina-empty">Aún no hay pedidos aquí.</p>;
  }

  return (
    <div className="cocina-finalizados-list">
      {pedidos.map((p) => (
        <FilaPedido key={p.id} pedido={p} />
      ))}
    </div>
  );
}
