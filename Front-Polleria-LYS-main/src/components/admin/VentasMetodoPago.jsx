import { IconoTarjeta } from "../common/Iconos";
import EChart from "./EChart";

const colores = ["var(--ember)", "var(--char)", "var(--rust)", "var(--gold)"];
const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

function normalizarMetodos(metodos) {
  const totalGeneral = metodos.reduce((acc, item) => acc + item.total, 0);

  return metodos.map((item, index) => ({
    ...item,
    colorIndex: index % colores.length,
    monto: formatoSoles.format(item.total),
    porcentaje: totalGeneral ? `${Math.round((item.total / totalGeneral) * 100)}%` : "0%",
  }));
}

function crearDonutOption(metodosPago) {
  return {
    animationDuration: 800,
    color: colores.map((color) => color.replace("var(--ember)", "#E23A32").replace("var(--char)", "#17130F").replace("var(--rust)", "#B32B24").replace("var(--gold)", "#E8A33D")),
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: "{b}<br/>{d}%",
    },
    series: [
      {
        name: "Metodo de pago",
        type: "pie",
        radius: ["58%", "78%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: metodosPago.length
          ? metodosPago.map((item) => ({ name: item.nombre, value: item.total }))
          : [{ name: "Sin ventas", value: 1, itemStyle: { color: "#E7E2DA" } }],
        emphasis: {
          scale: true,
          scaleSize: 5,
          itemStyle: {
            shadowBlur: 12,
            shadowColor: "rgba(27, 21, 18, 0.18)",
          },
        },
      },
    ],
  };
}

export default function VentasMetodoPago({ metodos = [] }) {
  const metodosPago = normalizarMetodos(metodos);
  const total = metodos.reduce((acc, item) => acc + item.total, 0);

  return (
    <section className="ticket-card admin-payment-card">
      <div className="admin-block-title">
        <IconoTarjeta size={18} color="var(--ember)" />
        <span className="font-display">Ventas por metodo de pago</span>
      </div>

      <div className="admin-payment-content">
        <div className="admin-donut-wrap">
          <EChart
            className="admin-donut"
            option={crearDonutOption(metodosPago)}
            ariaLabel="Grafico de ventas por metodo de pago"
          />

          <div className="admin-donut-center">
            <span>Total</span>
            <strong className="font-mono">{formatoSoles.format(total)}</strong>
          </div>
        </div>

        <div className="admin-payment-list">
          {metodosPago.length === 0 ? (
            <p className="admin-empty-text">No hay ventas pagadas registradas.</p>
          ) : metodosPago.map((item) => (
            <div className="admin-payment-row" key={item.nombre}>
              <div className="admin-payment-left">
                <span className={`admin-color-dot admin-color-dot-${item.colorIndex}`} />
                <span>{item.nombre}</span>
              </div>

              <div className="admin-payment-values">
                <strong className="font-mono">{item.porcentaje}</strong>
                <span className="font-mono">{item.monto}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
