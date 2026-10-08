import { useState, useMemo } from 'react';
import { Clock, CheckCircle2, Utensils, Calendar, X } from 'lucide-react';

export default function ActividadModal({ actividades = [], onClose }) {
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const actividadesFiltradas = useMemo(() => {
    if (filtroTipo === 'todos') return actividades;
    return actividades.filter((act) => act.tipo === filtroTipo);
  }, [actividades, filtroTipo]);

  function renderIcono(tipo) {
    switch (tipo) {
      case 'pedido_completado':
        return <CheckCircle2 size={18} strokeWidth={2.2} />;
      case 'reserva':
        return <Calendar size={18} strokeWidth={2.2} />;
      default:
        return <Utensils size={18} strokeWidth={2.2} />;
    }
  }

  return (
    <div className="mesa-modal-backdrop" onClick={onClose}>
      <div
        className="mesa-modal-card activity-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mesa-modal-header">
          <div className="activity-modal-header-left">
            <div className="activity-header-icon-wrap">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="mesa-modal-section-title">
                Historial de Actividad del Salón
              </h3>
              <span className="mesa-modal-subtitle">
                Eventos registrados hoy en el turno
              </span>
            </div>
          </div>
          <button
            type="button"
            className="activity-toggle-btn"
            onClick={onClose}
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filtros por tipo de actividad */}
        <div className="activity-modal-filters">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'pedido_creado', label: 'Pedidos nuevos' },
            { id: 'pedido_completado', label: 'Completados' },
            { id: 'reserva', label: 'Reservas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroTipo(tab.id)}
              className={`activity-modal-filter-btn ${filtroTipo === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista completa scrollable */}
        <div className="activity-modal-list">
          {actividadesFiltradas.map((item) => (
            <div key={item.id} className="activity-modal-item">
              <div className="activity-modal-item-main">
                <div className={`activity-avatar activity-modal-avatar ${item.tipoColor || 'rojo'}`}>
                  {renderIcono(item.tipo)}
                </div>
                <div className="activity-modal-item-details">
                  <span className="activity-modal-item-title">
                    {item.titulo || `Mesa ${item.mesaNumero}`}
                  </span>
                  <span className="activity-modal-item-desc">
                    {item.descripcion}
                  </span>
                  {item.ordenCodigo && (
                    <span className="activity-modal-item-order">
                      {item.ordenCodigo}
                    </span>
                  )}
                </div>
              </div>
              <span className="activity-modal-item-time">
                {item.hora}
              </span>
            </div>
          ))}

          {actividadesFiltradas.length === 0 && (
            <div className="activity-modal-empty">
              <p>No hay eventos que coincidan con este filtro.</p>
            </div>
          )}
        </div>

        <div className="mesa-modal-footer">
          <button
            type="button"
            className="btn-borrador activity-modal-close-btn"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
