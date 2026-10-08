import {
  IconoBilletera,
  IconoBolsaDinero,
  IconoCalendario,
  IconoGrafico,
} from "../common/Iconos";
import EChart from "./EChart";

const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

function crearTarjetas(resumen, tendencias = {}) {
  return [
    {
      id: 1,
      titulo: "Ventas del dia",
      monto: formatoSoles.format(resumen?.dia?.totalVentas || 0),
      comparativa: `${resumen?.dia?.cantidadPedidos || 0} pedidos pagados`,
      icono: <IconoBilletera size={18} color="var(--ember)" />,
      tendencia: tendencias.dia || { labels: ["0h", "24h"], values: [0, 0] },
    },
    {
      id: 2,
      titulo: "Ventas de la semana",
      monto: formatoSoles.format(resumen?.semana?.totalVentas || 0),
      comparativa: `${resumen?.semana?.cantidadPedidos || 0} pedidos pagados`,
      icono: <IconoCalendario size={18} color="var(--ember)" />,
      tendencia: tendencias.semana || { labels: ["lun", "mar", "mie", "jue", "vie", "sab", "dom"], values: [0, 0, 0, 0, 0, 0, 0] },
    },
    {
      id: 3,
      titulo: "Ventas del mes",
      monto: formatoSoles.format(resumen?.mes?.totalVentas || 0),
      comparativa: `${resumen?.mes?.cantidadPedidos || 0} pedidos pagados`,
      icono: <IconoGrafico size={18} color="var(--ember)" />,
      tendencia: tendencias.mes || { labels: ["1"], values: [0] },
    },
    {
      id: 4,
      titulo: "Ingresos totales",
      monto: formatoSoles.format(resumen?.total?.totalVentas || 0),
      comparativa: `${resumen?.total?.cantidadPedidos || 0} ventas realizadas`,
      icono: <IconoBolsaDinero size={18} color="var(--ember)" />,
      tendencia: tendencias.total || { labels: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    },
  ];
}

function crearSparklineOption(tarjeta) {
  const values = tarjeta.tendencia.values || [0];
  const labels = tarjeta.tendencia.labels || values.map((_, index) => String(index + 1));
  const datos = values.length > 1 ? values : [0, values[0] || 0];
  const etiquetas = values.length > 1 ? labels : ["inicio", labels[0] || "actual"];

  return {
    animationDuration: 650,
    color: ["#E23A32"],
    grid: { left: 4, right: 4, top: 4, bottom: 18 },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: (value) => formatoSoles.format(value),
      axisPointer: { type: "line", lineStyle: { color: "#E23A32", opacity: 0.35 } },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: etiquetas,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#6E655D",
        fontSize: 9,
        hideOverlap: true,
        interval: (index) => {
          if (etiquetas.length <= 7) return true;
          if (tarjeta.id === 1) return index % 6 === 0;
          if (tarjeta.id === 3) return index === 0 || index % 5 === 4 || index === etiquetas.length - 1;
          return true;
        },
      },
    },
    yAxis: { type: "value", show: false, scale: true },
    series: [
      {
        type: "line",
        data: datos,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: datos.length <= 2,
        emphasis: { focus: "series" },
        lineStyle: { color: "#E23A32", width: 2 },
        areaStyle: { color: "rgba(226, 58, 50, 0.12)" },
      },
    ],
  };
}

export default function TarjetasResumen({ resumen, tendencias }) {
  const tarjetas = crearTarjetas(resumen, tendencias);

  return (
    <div className="admin-summary-grid">
      {tarjetas.map((tarjeta) => (
        <article key={tarjeta.id} className="ticket-card admin-summary-card">
          <div>
            <div className="admin-summary-head">
              <div className="admin-summary-icon">{tarjeta.icono}</div>
              <span className="admin-summary-title">{tarjeta.titulo}</span>
            </div>

            <div className="admin-summary-body">
              <strong className="admin-summary-amount">{tarjeta.monto}</strong>
              <span className="admin-summary-badge">{tarjeta.comparativa}</span>
            </div>
          </div>

          <div className="admin-sparkline">
            <EChart
              className="admin-echart"
              option={crearSparklineOption(tarjeta)}
              ariaLabel={`Tendencia de ${tarjeta.titulo}`}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
