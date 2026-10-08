import { useEffect, useState } from "react";

// Cronómetro en vivo desde "inicio". Si se pasa "congelarEn", deja de correr
// y muestra el tiempo total fijo entre inicio y esa fecha (para el historial).
export function useTiempoTranscurrido(inicio, congelarEn) {
  const [ahora, setAhora] = useState(() =>
    congelarEn ? new Date(congelarEn).getTime() : Date.now()
  );

  useEffect(() => {
    if (congelarEn) {
      setAhora(new Date(congelarEn).getTime());
      return;
    }
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [congelarEn]);

  const segundosTotales = Math.max(
    0,
    Math.floor((ahora - new Date(inicio).getTime()) / 1000)
  );
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = segundosTotales % 60;
  const texto = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

  return { texto, segundosTotales, minutos };
}