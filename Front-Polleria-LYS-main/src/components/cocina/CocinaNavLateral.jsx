import { NavLink } from "react-router-dom";
import { BellRing, Clock } from "lucide-react";

export default function CocinaNavLateral() {
  return (
    <aside className="cocina-sidebar">
      <div className="cocina-sidebar-brand font-display">
        LEÑA Y<br />SABORES
      </div>

      <nav className="cocina-sidebar-nav">
        <NavLink
          to="/cocina"
          end
          className={({ isActive }) => `cocina-sidebar-link ${isActive ? "activo" : ""}`}
        >
          <BellRing size={17} />
          <span>Vista cocina</span>
        </NavLink>

        <NavLink
          to="/cocina/historial"
          className={({ isActive }) => `cocina-sidebar-link ${isActive ? "activo" : ""}`}
        >
          <Clock size={17} />
          <span>Historial</span>
        </NavLink>
      </nav>
    </aside>
  );
}