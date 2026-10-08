import { IconoCalendario } from "../common/Iconos";

export default function FiltroFechas({ filtros, onCambiar, onLimpiar }) {
  return (
    <div className="admin-filtro-fechas">
      <span className="admin-filtro-icon" aria-hidden="true">
        <IconoCalendario size={16} color="var(--smoke)" />
      </span>

      <label className="admin-filtro-campo">
        <span>Desde</span>
        <input
          type="date"
          className="admin-filtro-input"
          value={filtros.fechaInicio}
          max={filtros.fechaFin || undefined}
          onChange={(e) => onCambiar({ ...filtros, fechaInicio: e.target.value })}
        />
      </label>

      <label className="admin-filtro-campo">
        <span>Hasta</span>
        <input
          type="date"
          className="admin-filtro-input"
          value={filtros.fechaFin}
          min={filtros.fechaInicio || undefined}
          onChange={(e) => onCambiar({ ...filtros, fechaFin: e.target.value })}
        />
      </label>

      {(filtros.fechaInicio || filtros.fechaFin) && (
        <button type="button" className="admin-filtro-limpiar" onClick={onLimpiar}>
          Limpiar
        </button>
      )}
    </div>
  );
}
