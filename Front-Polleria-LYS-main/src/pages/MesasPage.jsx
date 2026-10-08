import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useMesas from '../hooks/useMesas';
import MesaCard from '../components/mesas/MesaCard';
import EstadisticasMesas from '../components/mesas/EstadisticasMesas';
import ActividadReciente from '../components/mesas/ActividadReciente';
import ActividadModal from '../components/mesas/ActividadModal';
import MesaDetalleModal from '../components/mesas/MesaDetalleModal';
import MesasNavLateral from '../components/mesas/MesasNavLateral';
import '../styles/mesas.css';

export default function MesasPage() {
  const navigate = useNavigate();
  const [zonaSeleccionada, setZonaSeleccionada] = useState('salon_principal');
  const [busqueda, setBusqueda] = useState('');
  const [sidebarActividadColapsado, setSidebarActividadColapsado] = useState(false);
  const [navLateralColapsado, setNavLateralColapsado] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [mostrarModalActividad, setMostrarModalActividad] = useState(false);

  const { mesas, estadisticas, actividades, recargar } = useMesas(zonaSeleccionada);

  // Filtrado de mesas por texto de búsqueda
  const mesasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return mesas;
    const term = busqueda.toLowerCase().trim();
    return mesas.filter(
      (m) =>
        m.numero.toLowerCase().includes(term) ||
        (m.pedidoId && m.pedidoId.toLowerCase().includes(term))
    );
  }, [mesas, busqueda]);

  function handleAbrirNuevoPedido() {
    // Buscar la primera mesa libre disponible o ir a la 01
    const primeraLibre = mesas.find((m) => m.estado === 'libre');
    const num = primeraLibre ? primeraLibre.numero : '01';
    navigate(`/mesas/${num}/pedido`);
  }

  function handleMesaClick(mesa) {
    setMesaSeleccionada(mesa);
  }

  function getNombreZonaActual() {
    switch (zonaSeleccionada) {
      case 'terraza':
        return 'Mesas de la Terraza';
      case 'segundo_piso':
        return 'Mesas del Segundo piso';
      case 'todas':
        return 'Todas las zonas del local';
      default:
        return 'Mesas del Salón principal';
    }
  }

  return (
    <div className="mesas-page-wrapper">
      {/* 1. Barra Lateral Izquierda para el Salón (Vertical POS) */}
      <MesasNavLateral
        zonaSeleccionada={zonaSeleccionada}
        onSelectZona={setZonaSeleccionada}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onNuevoPedido={handleAbrirNuevoPedido}
        actividadesCount={actividades.length}
        sidebarActividadAbierto={!sidebarActividadColapsado}
        onToggleActividad={() => setSidebarActividadColapsado((prev) => !prev)}
        colapsado={navLateralColapsado}
        onToggleColapsado={() => setNavLateralColapsado((prev) => !prev)}
      />

      {/* 2. Workspace Central: KPIs + Plano de Mesas */}
      <div className="mesas-central-workspace">
        {/* Cabezal limpio del área de trabajo (sin duplicar navbars) */}
        <div className="mesas-workspace-header">
          <div>
            <h1 className="mesas-workspace-title">{getNombreZonaActual()}</h1>
            <span className="mesas-workspace-subtitle">
              {mesasFiltradas.length} {mesasFiltradas.length === 1 ? 'mesa activa' : 'mesas activas'} · Vista en tiempo real
            </span>
          </div>

          <div className="mesas-workspace-quick-actions">
            <button
              type="button"
              className={`btn-toggle-actividad ${!sidebarActividadColapsado ? 'activa' : ''}`}
              onClick={() => setSidebarActividadColapsado((prev) => !prev)}
              title={sidebarActividadColapsado ? 'Abrir actividad reciente' : 'Ocultar panel de actividad'}
            >
              <span>Actividad reciente</span>
              {actividades.length > 0 && (
                <span className="btn-toggle-actividad-badge">{actividades.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Estado */}
        <EstadisticasMesas estadisticas={estadisticas} />

        {/* Contenido Principal: Plano + Actividad */}
        <main className={`mesas-main-content ${sidebarActividadColapsado ? 'sidebar-collapsed' : ''}`}>
          <section className="mesas-floor-plan">
            <div className="mesas-grid">
              {mesasFiltradas.map((mesa) => (
                <MesaCard
                  key={mesa.id}
                  mesa={mesa}
                  onClick={handleMesaClick}
                />
              ))}
            </div>

            {mesasFiltradas.length === 0 && (
              <div className="mesas-empty-state">
                {busqueda ? (
                  <p className="mesas-empty-state-message">
                    No se encontraron mesas con "{busqueda}".
                  </p>
                ) : (
                  <div className="mesas-empty-expansion">
                    <span className="mesas-empty-emoji">🏗️</span>
                    <h3 className="mesas-empty-title">Zona en ampliación</h3>
                    <p className="mesas-empty-desc">
                      Esta área está reservada para futuras mesas de la pollería. Todas las mesas activas se encuentran en el <strong>Salón principal</strong>.
                    </p>
                    <button
                      type="button"
                      className="btn-nuevo-pedido mesas-empty-btn"
                      onClick={() => setZonaSeleccionada('salon_principal')}
                    >
                      Volver al Salón principal
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Panel lateral derecho de actividad */}
          {!sidebarActividadColapsado && (
            <ActividadReciente
              actividades={actividades}
              onToggleCollapse={() => setSidebarActividadColapsado(true)}
              onVerTodo={() => setMostrarModalActividad(true)}
            />
          )}
        </main>
      </div>

      {/* Modal de detalle de mesa */}
      {mesaSeleccionada && (
        <MesaDetalleModal
          mesa={mesaSeleccionada}
          onClose={() => setMesaSeleccionada(null)}
          onMesaUpdated={recargar}
        />
      )}

      {/* Modal de historial completo de actividad */}
      {mostrarModalActividad && (
        <ActividadModal
          actividades={actividades}
          onClose={() => setMostrarModalActividad(false)}
        />
      )}
    </div>
  );
}
