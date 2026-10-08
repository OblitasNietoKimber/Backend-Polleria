import { Clock, CheckCircle2, Utensils, Calendar, ChevronRight, X } from 'lucide-react';

export default function ActividadReciente({ actividades = [], onToggleCollapse, onVerTodo }) {
  function renderIcono(tipo) {
    switch (tipo) {
      case 'pedido_completado':
        return <CheckCircle2 size={16} strokeWidth={2.2} />;
      case 'reserva':
        return <Calendar size={16} strokeWidth={2.2} />;
      default:
        return <Utensils size={16} strokeWidth={2.2} />;
    }
  }

  return (
    <aside className="mesas-activity-sidebar">
      <div className="activity-header">
        <div className="activity-header-left">
          <div className="activity-header-icon-wrap">
            <Clock size={18} strokeWidth={2} />
          </div>
          <h3 className="activity-title">Actividad reciente</h3>
        </div>
        {onToggleCollapse && (
          <button
            className="activity-toggle-btn"
            onClick={onToggleCollapse}
            title="Ocultar panel"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="activity-list">
        {actividades.slice(0, 8).map((item) => (
          <div key={item.id} className="activity-item">
            <div className="activity-item-main">
              <div className={`activity-avatar ${item.tipoColor || 'rojo'}`}>
                {renderIcono(item.tipo)}
              </div>
              <div className="activity-details">
                <span className="activity-item-title">{item.titulo || `Mesa ${item.mesaNumero}`}</span>
                <span className="activity-item-desc">{item.descripcion}</span>
                {item.ordenCodigo && (
                  <span className="activity-item-order">{item.ordenCodigo}</span>
                )}
              </div>
            </div>
            <span className="activity-time">{item.hora}</span>
          </div>
        ))}

        {actividades.length === 0 && (
          <p className="activity-empty-text">No hay actividades recientes registradas.</p>
        )}
      </div>

      <button className="activity-footer-btn" type="button" onClick={onVerTodo}>
        <span className="activity-footer-btn-inner">
          <span>Ver toda la actividad</span>
          <ChevronRight size={14} />
        </span>
      </button>
    </aside>
  );
}
