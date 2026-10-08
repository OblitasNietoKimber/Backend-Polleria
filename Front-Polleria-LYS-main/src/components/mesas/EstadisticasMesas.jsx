export default function EstadisticasMesas({ estadisticas }) {
  const { libres = 0, ocupadas = 0, reservadas = 0, pctLibres = 0, pctOcupadas = 0, pctReservadas = 0 } = estadisticas || {};

  return (
    <div className="mesas-kpi-grid">
      {/* Libres */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper libres">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 21v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
            <path d="M4 11h16" />
            <rect x="7" y="5" width="10" height="6" rx="1" />
          </svg>
        </div>
        <div className="kpi-data">
          <div className="kpi-number-row">
            <span className="kpi-number">{libres}</span>
            <span className="kpi-label">Libres</span>
          </div>
          <span className="kpi-subtext">{pctLibres}% del total</span>
        </div>
      </div>

      {/* Ocupadas */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper ocupadas">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 21v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
            <path d="M4 11h16" />
            <rect x="7" y="5" width="10" height="6" rx="1" />
          </svg>
        </div>
        <div className="kpi-data">
          <div className="kpi-number-row">
            <span className="kpi-number">{ocupadas}</span>
            <span className="kpi-label">Ocupadas</span>
          </div>
          <span className="kpi-subtext">{pctOcupadas}% del total</span>
        </div>
      </div>

      {/* Reservadas */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper reservadas">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="kpi-data">
          <div className="kpi-number-row">
            <span className="kpi-number">{reservadas}</span>
            <span className="kpi-label">Reservadas</span>
          </div>
          <span className="kpi-subtext">{pctReservadas}% del total</span>
        </div>
      </div>
    </div>
  );
}

