import "../styles/cocina.css";
import cocinaService from "../services/cocinaService";
import CocinaNavLateral from "../components/cocina/CocinaNavLateral";
import PedidosFinalizados from "../components/cocina/PedidosFinalizados";

function esHoy(fechaISO) {
  if (!fechaISO) return false;
  const f = new Date(fechaISO);
  const hoy = new Date();
  return f.toDateString() === hoy.toDateString();
}

function dentroDeDias(fechaISO, dias) {
  if (!fechaISO) return false;
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  return new Date(fechaISO).getTime() >= limite;
}

export default function HistorialCocinaPage() {
  const finalizados = cocinaService.getPedidosFinalizados();
  const deHoy = finalizados.filter((p) => esHoy(p.finalizadoAt));
  const ultimos30 = finalizados.filter(
    (p) => !esHoy(p.finalizadoAt) && dentroDeDias(p.finalizadoAt, 30)
  );

  return (
    <div className="lys-root admin-screen">
      <div className="cocina-shell">
        <CocinaNavLateral />

        <div className="cocina-main">
          <div className="cocina-topbar-local">
            <h1 className="font-display cocina-page-title">Historial de pedidos</h1>
          </div>

          <section className="cocina-history-section">
            <h2 className="cocina-seccion-titulo">Hoy ({deHoy.length})</h2>
            <PedidosFinalizados pedidos={deHoy} />
          </section>

          <section>
            <h2 className="cocina-seccion-titulo">Últimos 30 días ({ultimos30.length})</h2>
            <PedidosFinalizados pedidos={ultimos30} />
          </section>
        </div>
      </div>
    </div>
  );
}
