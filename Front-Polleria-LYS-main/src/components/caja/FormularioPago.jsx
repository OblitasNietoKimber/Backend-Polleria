import { Banknote, CreditCard, Smartphone } from "lucide-react";

const METODOS = [
  { nombre: "Efectivo", Icono: Banknote },
  { nombre: "Yape/Plin", Icono: Smartphone },
  { nombre: "Tarjeta", Icono: CreditCard },
];

export default function FormularioPago({ metodo, onMetodoChange, monto, onMontoChange, total }) {
  const base = Math.ceil(total / 10) * 10;
  const montosRapidos = [...new Set([base, Math.max(100, base), Math.max(200, base)])];

  return (
    <div className="caja-payment">
      <p className="caja-label">Método de pago</p>
      <div className="caja-metodos">
        {METODOS.map(({ nombre, Icono }) => (
          <button
            type="button"
            key={nombre}
            className={metodo === nombre ? "active" : ""}
            onClick={() => onMetodoChange(nombre)}
            aria-pressed={metodo === nombre}
          >
            <Icono size={18} />
            {nombre}
          </button>
        ))}
      </div>

      {metodo === "Efectivo" ? (
        <>
          <label className="caja-label" htmlFor="monto-recibido">Monto recibido</label>
          <div className="caja-money-input">
            <span>S/</span>
            <input
              id="monto-recibido"
              type="number"
              min="0"
              max="10000"
              step="0.10"
              placeholder="0.00"
              value={monto}
              onChange={(e) => {
                const valor = e.target.value;
                if (valor === "" || Number.parseFloat(valor) <= 10000) onMontoChange(valor);
              }}
            />
          </div>
          <div className="caja-quick-amounts" aria-label="Montos rápidos">
            <span>Montos rápidos</span>
            {montosRapidos.map((valor) => (
              <button type="button" key={valor} onClick={() => onMontoChange(String(valor))}>
                S/ {valor}
              </button>
            ))}
            <button type="button" onClick={() => onMontoChange(total.toFixed(2))}>Exacto</button>
          </div>
        </>
      ) : (
        <div className="caja-digital-note">
          El importe de S/ {total.toFixed(2)} se registrará con {metodo}.
        </div>
      )}
    </div>
  );
}
