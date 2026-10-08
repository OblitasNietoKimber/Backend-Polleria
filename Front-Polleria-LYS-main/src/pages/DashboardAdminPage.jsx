import { useMemo, useState } from "react";
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

  const resumen = useMemo(() => cajaService.getResumenVentas(filtros), [filtros]);
  const productos = useMemo(() => cajaService.getProductosMasVendidos(filtros), [filtros]);
  const metodosPago = useMemo(() => cajaService.getVentasPorMetodoPago(filtros), [filtros]);
  const ventasPorDia = useMemo(() => cajaService.getVentasPorDia(filtros), [filtros]);
  const historial = useMemo(() => cajaService.getHistorialVentas(filtros), [filtros]);
  const pedidosPendientes = useMemo(() => cajaService.getPedidosPendientes().length, []);
  const tendenciasResumen = useMemo(() => cajaService.getTendenciasResumen(), []);
  const metricasPorDia = useMemo(() => cajaService.getMetricasOperativasPorDia(), []);

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
