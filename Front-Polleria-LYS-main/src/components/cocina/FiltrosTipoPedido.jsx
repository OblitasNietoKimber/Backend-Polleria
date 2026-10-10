import { LayoutGrid, UtensilsCrossed, Bike, ShoppingBag } from "lucide-react";

const FILTROS = [
  { id: "todos", label: "Todos", icono: LayoutGrid },
  { id: "salon", label: "Salón", icono: UtensilsCrossed },
  { id: "delivery", label: "Delivery", icono: Bike },
  { id: "recojo", label: "Para llevar", icono: ShoppingBag },
];

export default function FiltrosTipoPedido({ filtroActivo, onCambiarFiltro }) {
  return (
    <div className="cocina-filtros">
      {FILTROS.map(({ id, label, icono: Icono }) => (
        <button
          key={id}
          type="button"
          className={`cocina-filtro-btn ${filtroActivo === id ? "activo" : ""}`}
          onClick={() => onCambiarFiltro(id)}
        >
          <Icono size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}