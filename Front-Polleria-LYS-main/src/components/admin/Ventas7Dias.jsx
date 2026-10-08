import { useMemo, useState } from "react";
import { IconoGrafico } from "../common/Iconos";
import EChart from "./EChart";

const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

const opcionesPeriodo = {
  "7dias": { dias: 7, label: "Ultimos 7 dias" },
  "30dias": { dias: 30, label: "Ultimos 30 dias" },
};

function formatearFechaLocal(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function crearRangoDias(cantidad) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Array.from({ length: cantidad }, (_, index) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - (cantidad - 1 - index));
    return formatearFechaLocal(fecha);
  });
}

function crearPuntos(ventas, cantidadDias) {
  const ventasPorFecha = new Map(ventas.map((venta) => [venta.fecha, venta.total]));

  return crearRangoDias(cantidadDias).map((fecha) => ({
    fecha,
    dia: new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
    total: ventasPorFecha.get(fecha) || 0,
  }));
}

function crearVentasOption(puntos) {
  return {
    animationDuration: 850,
    color: ["#E23A32"],
    grid: { left: 48, right: 18, top: 18, bottom: 28 },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: (value) => formatoSoles.format(value),
      axisPointer: { type: "line", lineStyle: { color: "#E23A32", opacity: 0.35 } },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: puntos.map((punto) => punto.dia),
      axisLine: { lineStyle: { color: "#E7E2DA" } },
      axisTick: { show: false },
      axisLabel: { color: "#6E655D", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        color: "#9E958C",
        fontSize: 10,
        formatter: (value) => `S/ ${value}`,
      },
      splitLine: { lineStyle: { color: "#F0EBE5", type: "dashed" } },
    },
    series: [
      {
        name: "Ventas",
        type: "line",
        data: puntos.map((punto) => punto.total),
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { color: "rgba(226, 58, 50, 0.14)" },
        emphasis: { focus: "series" },
      },
    ],
  };
}

export default function Ventas7Dias({ ventas = [] }) {
  const [periodo, setPeriodo] = useState("7dias");
  const opcionActiva = opcionesPeriodo[periodo];
  const titulo = `Ventas de los ${opcionActiva.label.toLowerCase()}`;
  const puntos = useMemo(() => crearPuntos(ventas, opcionActiva.dias), [ventas, opcionActiva.dias]);

  return (
    <section className="ticket-card admin-sales-card">
      <div className="admin-sales-head">
        <div className="admin-block-title">
          <IconoGrafico size={18} color="var(--ember)" />
          <span className="font-display">{titulo}</span>
        </div>

        <select className="admin-select" value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
          <option value="7dias">{opcionesPeriodo["7dias"].label}</option>
          <option value="30dias">{opcionesPeriodo["30dias"].label}</option>
        </select>
      </div>

      <div className="admin-chart-area">
        <EChart
          className="admin-line-chart"
          option={crearVentasOption(puntos)}
          ariaLabel={`Grafico de ${titulo.toLowerCase()}`}
        />
      </div>

      <div className="admin-chart-legend">
        <span />
        <p>{puntos.length > 0 ? "Ventas (S/)" : "Sin ventas para graficar"}</p>
      </div>
    </section>
  );
}
