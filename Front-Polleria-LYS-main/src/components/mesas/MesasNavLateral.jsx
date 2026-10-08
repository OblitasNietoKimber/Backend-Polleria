import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  UtensilsCrossed,
  SunMedium,
  Building2,
  Grid2X2,
  Clock,
  ChefHat,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { ZONAS_SALON } from '../../data/mesasData';
import authService from '../../services/authService';

export default function MesasNavLateral({
  zonaSeleccionada,
  onSelectZona,
  busqueda,
  onBusquedaChange,
  onNuevoPedido,
  actividadesCount = 0,
  sidebarActividadAbierto = true,
  onToggleActividad,
  colapsado = false,
  onToggleColapsado,
}) {
  const navigate = useNavigate();

  const usuarioActual = authService.getCurrentUser();
  const nombreUsuario = usuarioActual?.nombre
    ? `${usuarioActual.nombre} ${usuarioActual.apellido || ''}`.trim()
    : 'Ana Rodríguez';

  function getRolLabel(rol) {
    if (rol === 'admin') return 'Administrador';
    if (rol === 'mesera') return 'Mesera en turno';
    if (rol === 'cocina') return 'Personal de cocina';
    if (rol === 'cajero') return 'Cajero';
    return 'Mesera en turno';
  }

  const rolUsuario = getRolLabel(usuarioActual?.rol);

  function getIconoZona(id) {
    switch (id) {
      case 'terraza':
        return <SunMedium size={18} />;
      case 'segundo_piso':
        return <Building2 size={18} />;
      case 'todas':
        return <Grid2X2 size={18} />;
      default:
        return <UtensilsCrossed size={18} />;
    }
  }

  return (
    <aside className={`mesas-nav-lateral ${colapsado ? 'colapsado' : ''}`}>
      {/* Botón superior de Nuevo Pedido */}
      <div className="lateral-top-action">
        <button
          type="button"
          className="btn-lateral-nuevo-pedido"
          onClick={onNuevoPedido}
          title="Tomar nuevo pedido"
        >
          <Plus size={18} />
          {!colapsado && <span>Nuevo pedido</span>}
        </button>
      </div>

      {/* Buscador de mesas */}
      {!colapsado ? (
        <div className="lateral-search-box">
          <Search size={16} className="lateral-search-icon" />
          <input
            type="text"
            className="lateral-search-input"
            placeholder="Buscar mesa o pedido..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </div>
      ) : (
        <button
          type="button"
          className="lateral-icon-btn"
          title="Buscar mesa o pedido"
          onClick={onToggleColapsado}
        >
          <Search size={18} />
        </button>
      )}

      {/* Lista de Ambientes / Zonas */}
      <div className="lateral-section">
        {!colapsado && <span className="lateral-section-title">Ambientes</span>}
        <nav className="lateral-nav-list">
          {ZONAS_SALON.map((zona) => {
            const esActiva = zonaSeleccionada === zona.id;
            return (
              <button
                key={zona.id}
                type="button"
                className={`lateral-nav-item ${esActiva ? 'activo' : ''}`}
                onClick={() => onSelectZona(zona.id)}
                title={zona.nombre}
              >
                <span className="lateral-item-icon">{getIconoZona(zona.id)}</span>
                {!colapsado && <span className="lateral-item-label">{zona.nombre}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Panel de Actividad Reciente */}
      <div className="lateral-section">
        {!colapsado && <span className="lateral-section-title">Herramientas</span>}
        <button
          type="button"
          className={`lateral-nav-item ${sidebarActividadAbierto ? 'activo-secundario' : ''}`}
          onClick={onToggleActividad}
          title={sidebarActividadAbierto ? 'Ocultar panel de actividad' : 'Ver actividad reciente'}
        >
          <span className="lateral-item-icon">
            <Clock size={18} />
          </span>
          {!colapsado && (
            <>
              <span className="lateral-item-label">Actividad</span>
              {actividadesCount > 0 && (
                <span className="lateral-item-badge">{actividadesCount}</span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Footer con perfil y colapso */}
      <div className="lateral-footer">
        {!colapsado && (
          <div className="lateral-user-info">
            <div className="lateral-user-avatar">
              <User size={16} />
            </div>
            <div className="lateral-user-details">
              <span className="lateral-user-name" title={nombreUsuario}>{nombreUsuario}</span>
              <span className="lateral-user-role">{rolUsuario}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn-collapse-lateral"
          onClick={onToggleColapsado}
          title={colapsado ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
        >
          {colapsado ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
