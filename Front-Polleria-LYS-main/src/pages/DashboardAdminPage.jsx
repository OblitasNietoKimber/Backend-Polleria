import { useCallback, useEffect, useMemo, useState } from "react";
import cajaService from "../services/cajaService";
import FiltroFechas from "../components/admin/FiltroFechas";
import MetricasOperativas from "../components/admin/MetricasOperativas";
import ProductosTop from "../components/admin/ProductosTop";
import HistorialVentas from "../components/admin/HistorialVentas";
import TarjetasResumen from "../components/admin/TarjetasResumen";
import Ventas7Dias from "../components/admin/Ventas7Dias";
import VentasMetodoPago from "../components/admin/VentasMetodoPago";

export default function DashboardAdminPage() {
  const [filtros, setFiltros] = useState({ fechaInicio: "", fechaFin: "" });
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const actualizar = useCallback(() => setRevision(valor => valor + 1), []);
  useEffect(() => {
    let activo = true, consultando = false;
    async function cargar() {
      if (consultando) return;
      consultando = true;
      try {
        const data = await cajaService.getPedidos();
        if (activo) { setPedidos(data); setError(""); }
      } catch (err) {
        if (activo) setError(err.message || "No se pudo consultar las ventas.");
      } finally {
        consultando = false;
        if (activo) setCargando(false);
      }
    }
    cargar();
    const timer = setInterval(cargar, 10000);
    return () => { activo = false; clearInterval(timer); };
  }, [revision]);

  const resumen = useMemo(() => cajaService.getResumenVentas(filtros, pedidos), [filtros, pedidos]);
  const productos = useMemo(() => cajaService.getProductosMasVendidos(filtros, pedidos), [filtros, pedidos]);
  const metodosPago = useMemo(() => cajaService.getVentasPorMetodoPago(filtros, pedidos), [filtros, pedidos]);
  const ventasPorDia = useMemo(() => cajaService.getVentasPorDia(filtros, pedidos), [filtros, pedidos]);
  const historial = useMemo(() => cajaService.getHistorialVentas(filtros, pedidos), [filtros, pedidos]);
  const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente" && p.total > 0).length;
  const tendenciasResumen = useMemo(() => cajaService.getTendenciasResumen(pedidos), [pedidos]);
  const metricasPorDia = useMemo(() => cajaService.getMetricasOperativasPorDia(pedidos), [pedidos]);

  const limpiarFiltros = () => setFiltros({ fechaInicio: "", fechaFin: "" });

  return (
    <div className="lys-root admin-screen">
      <main className="admin-content">
        <section className="admin-page-head">
          <div>
            <h1>DASHBOARD</h1>
            <p>Resumen general de tu restaurante</p>
          </div>

          <FiltroFechas filtros={filtros} onCambiar={setFiltros} onLimpiar={limpiarFiltros} />
        </section>

        {cargando && <p role="status">Consultando ventas…</p>}
        {error && <div role="alert">{error}<button type="button" onClick={actualizar}>Reintentar</button></div>}
        <TarjetasResumen resumen={resumen} tendencias={tendenciasResumen} />
        <MetricasOperativas resumen={resumen} pedidosPendientes={pedidosPendientes} tendencias={metricasPorDia} />

        <section className="admin-double-grid">
          <VentasMetodoPago metodos={metodosPago} />
          <ProductosTop productos={productos} />
        </section>

        <section className="admin-double-grid">
          <Ventas7Dias ventas={ventasPorDia} />
          <HistorialVentas ventas={historial} />
        </section>
      </main>
    </div>
  );
}
