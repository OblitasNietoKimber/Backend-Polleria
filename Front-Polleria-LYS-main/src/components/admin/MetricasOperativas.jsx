import {
  IconoCheckCirculo,
  IconoGrafico,
  IconoReloj,
  IconoTendencia,
  IconoXCirculo,
} from "../common/Iconos";
import EChart from "./EChart";

const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

function crearMetricas(resumen, pedidosPendientes, tendencias = {}) {
  const labels = tendencias.labels || [];

  return [
    {
      id: "completados",
      etiqueta: "Pedidos completados",
      valor: `${resumen?.total?.cantidadPedidos || 0}`,
      comparativa: `${resumen?.dia?.cantidadPedidos || 0} completados hoy`,
      claseIcono: "green",
      colorBarra: "#2E7D32",
      icono: <IconoCheckCirculo size={16} />,
      serie: tendencias.completados || [0],
      labels,
    },
    {
      id: "pendientes",
      etiqueta: "Pedidos pendientes",
      valor: `${pedidosPendientes}`,
      comparativa: "Pendientes por cobrar",
      claseIcono: "yellow",
      colorBarra: "#E8A33D",
      icono: <IconoReloj size={16} />,
      serie: tendencias.pendientes || [0],
      labels,
    },
    {
      id: "cancelados",
      etiqueta: "Pedidos cancelados",
      valor: "0",
      comparativa: "Sin cancelaciones registradas",
      claseIcono: "red",
      colorBarra: "#E23A32",
      icono: <IconoXCirculo size={16} />,
      serie: tendencias.cancelados || [0],
      labels,
    },
    {
      id: "ventas",
      etiqueta: "Total ventas realizadas",
      valor: formatoSoles.format(resumen?.total?.totalVentas || 0),
      comparativa: `${resumen?.semana?.cantidadPedidos || 0} ventas esta semana`,
      claseIcono: "blue",
      colorBarra: "#1565C0",
      icono: <IconoGrafico size={16} />,
      serie: tendencias.ventas || [0],
      labels,
    },
  ];
}

function crearTendenciaOption(metrica) {
  const labels = metrica.labels.length ? metrica.labels : metrica.serie.map((_, index) => index + 1);
  const data = metrica.serie.map((valor, index) =>
    index === metrica.serie.length - 1
      ? { value: valor, symbol: "circle", symbolSize: 7 }
      : valor
  );

  return {
    animationDuration: 650,
    color: [metrica.colorBarra],
    grid: { left: 2, right: 2, top: 8, bottom: 18 },
    tooltip: {
      trigger: "axis",
      appendTo: typeof document !== "undefined" ? document.body : undefined,
      confine: false,
      backgroundColor: "#FFFFFF",
      borderColor: "#E7E2DA",
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: "box-shadow: 0 10px 24px rgba(27, 21, 18, 0.14); border-radius: 6px; z-index: 9999;",
      textStyle: {
        color: "#17130F",
        fontFamily: "Work Sans, sans-serif",
        fontSize: 12,
        lineHeight: 18,
      },
      formatter: (items) => {
        const item = items[0];
        return `
          <div class="echart-tooltip">
            <div class="echart-tooltip-axis">${item.axisValue}</div>
            <div class="echart-tooltip-title">${metrica.etiqueta}</div>
            <div class="echart-tooltip-value ${metrica.claseIcono}">Valor: ${item.value}</div>
          </div>
        `;
      },
      axisPointer: { type: "line", lineStyle: { color: metrica.colorBarra, opacity: 0.35 } },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#6E655D",
        fontSize: 9,
        interval: 0,
      },
    },
    yAxis: { type: "value", show: false, scale: true },
    series: [
      {
        type: "line",
        data,
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
        lineStyle: { color: metrica.colorBarra, width: 2.5 },
        areaStyle: { color: `${metrica.colorBarra}24` },
        emphasis: { focus: "series" },
      },
    ],
  };
}

export default function MetricasOperativas({ resumen, pedidosPendientes = 0, tendencias }) {
  const metricas = crearMetricas(resumen, pedidosPendientes, tendencias);

  return (
    <section className="ticket-card admin-ops-card">
      <div className="admin-block-title">
        <IconoTendencia size={18} color="var(--ember)" />
        <span className="font-display">Metricas operativas</span>
      </div>

      <div className="admin-ops-grid">
        {metricas.map((metrica) => (
          <article className="admin-mini-card" key={metrica.id}>
            <div className="admin-mini-head">
              <div className={`admin-mini-icon ${metrica.claseIcono}`}>
                {metrica.icono}
              </div>

              <div className="admin-mini-info">
                <span className="admin-mini-label">{metrica.etiqueta}</span>
                <strong className="admin-mini-value">{metrica.valor}</strong>
                <span className={`admin-mini-trend ${metrica.claseIcono}`}>
                  {metrica.comparativa}
                </span>
              </div>
            </div>

            <div className={`admin-mini-chart-panel ${metrica.claseIcono}`}>
              <span className="admin-mini-period">Ultimos 5 dias</span>
              <EChart
                className="admin-echart"
                option={crearTendenciaOption(metrica)}
                ariaLabel={`Grafico de ${metrica.etiqueta}`}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
