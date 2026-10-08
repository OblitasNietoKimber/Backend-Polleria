import "../styles/cocina.css";
import { useEffect, useState } from "react";
import { ClipboardList, CookingPot, BellRing } from "lucide-react";
import usePedidosCocina from "../hooks/usePedidosCocina";
import cocinaService, { ESTADOS_COCINA } from "../services/cocinaService";
import ColumnaPedidos from "../components/cocina/ColumnaPedidos";
import TarjetaPedidoCocina from "../components/cocina/TarjetaPedidoCocina";
import CocinaNavLateral from "../components/cocina/CocinaNavLateral";
import FiltrosTipoPedido from "../components/cocina/FiltrosTipoPedido";

export default function CocinaPage() {
  const { pedidos, recargar } = usePedidosCocina();
  const [filtro, setFiltro] = useState("todos");
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  function handleCambiarEstado(id, nuevoEstado) {
    cocinaService.cambiarEstado(id, nuevoEstado);
    recargar();
  }

  const pedidosFiltrados =
    filtro === "todos" ? pedidos : pedidos.filter((p) => (p.tipo || "salon") === filtro);

  const nuevos = pedidosFiltrados.filter((p) => p.estadoCocina === ESTADOS_COCINA.NUEVO);
  const enPreparacion = pedidosFiltrados.filter((p) => p.estadoCocina === ESTADOS_COCINA.EN_PREPARACION);
  const listos = pedidosFiltrados.filter((p) => p.estadoCocina === ESTADOS_COCINA.LISTO);

  return (
    <div className="lys-root admin-screen">
      <div className="cocina-shell">
        <CocinaNavLateral />

        <div className="cocina-main">
          <div className="cocina-topbar-local">
            <h1 className="font-display cocina-page-title">Panel de Cocina</h1>
            <div className="cocina-reloj-actual">
              <div className="cocina-reloj-hora">
                {ahora.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="cocina-reloj-fecha">
                {ahora
                  .toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
                  .toUpperCase()}
              </div>
            </div>
          </div>

          <FiltrosTipoPedido filtroActivo={filtro} onCambiarFiltro={setFiltro} />

          <div className="cocina-board">
            <ColumnaPedidos titulo="Nuevos pedidos" variante="nuevo" icono={ClipboardList} pedidos={nuevos}>
              {nuevos.map((p) => (
                <TarjetaPedidoCocina key={p.id} pedido={p} onCambiarEstado={handleCambiarEstado} />
              ))}
            </ColumnaPedidos>

            <ColumnaPedidos titulo="Preparando" variante="preparacion" icono={CookingPot} pedidos={enPreparacion}>
              {enPreparacion.map((p) => (
                <TarjetaPedidoCocina key={p.id} pedido={p} onCambiarEstado={handleCambiarEstado} />
              ))}
            </ColumnaPedidos>

            <ColumnaPedidos titulo="Listos" variante="listo" icono={BellRing} pedidos={listos}>
              {listos.map((p) => (
                <TarjetaPedidoCocina key={p.id} pedido={p} onCambiarEstado={handleCambiarEstado} />
              ))}
            </ColumnaPedidos>
          </div>
        </div>
      </div>
    </div>
  );
}
