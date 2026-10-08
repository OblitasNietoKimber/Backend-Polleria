import { Search, X } from "lucide-react";

export default function BuscadorPedidos({ valor, onChange }) {
  return (
    <div className="caja-search-wrap">
      <Search size={19} aria-hidden="true" />
      <input
        className="caja-search"
        type="search"
        aria-label="Buscar pedidos"
        placeholder="Buscar pedido o mesa..."
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
      {valor && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpiar búsqueda">
          <X size={17} />
        </button>
      )}
    </div>
  );
}
