import { useCallback, useEffect, useState } from "react";
import cocinaService from "../services/cocinaService";

const INTERVALO_MS = 5000; // cada 5 segundos revisa si hay pedidos nuevos

export default function usePedidosCocina() {
  const [pedidos, setPedidos] = useState([]);

  const recargar = useCallback(() => {
    setPedidos(cocinaService.getPedidosActivos());
  }, []);

  useEffect(() => {
    recargar();

    const intervalo = setInterval(recargar, INTERVALO_MS);

    function onStorageChange(evento) {
      if (evento.key === "lys_pedidos") recargar();
    }
    window.addEventListener("storage", onStorageChange);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [recargar]);

  return { pedidos, recargar };
}