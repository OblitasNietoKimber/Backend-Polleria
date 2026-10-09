import { useState, useEffect, useCallback, useMemo } from 'react';
import mesaService from '../services/mesaService';

export default function useMesas(zona = 'salon_principal') {
  const [listaCompleta, setListaCompleta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    try {
      const data = await mesaService.getMesas();
      setListaCompleta(data || []);
      setError(null);
    } catch (err) {
      console.error('Error al sincronizar mesas con InsForge:', err);
      setError(err.message || 'Error al conectar con PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;

    async function cargarInicial() {
      try {
        const data = await mesaService.getMesas();
        if (montado) {
          setListaCompleta(data || []);
          setError(null);
        }
      } catch (err) {
        if (montado) {
          setError(err.message || 'Error al conectar con PostgreSQL.');
        }
      } finally {
        if (montado) {
          setLoading(false);
        }
      }
    }

    cargarInicial();
    const timer = setInterval(recargar, 10000);
    return () => {
      montado = false;
      clearInterval(timer);
    };
  }, [recargar]);

  // Filtrar mesas por la zona seleccionada
  const mesas = useMemo(() => {
    if (!zona || zona === 'todas') return listaCompleta;
    return listaCompleta.filter((m) => m.zona === zona);
  }, [listaCompleta, zona]);

  // Estadísticas derivadas según la zona
  const estadisticas = useMemo(() => {
    return mesaService.getEstadisticasMesas(listaCompleta, zona);
  }, [listaCompleta, zona]);

  return {
    mesas,
    estadisticas,
    actividades: [],
    loading,
    error,
    recargar,
    liberarMesa: async (mesaId) => {
      await mesaService.liberarMesa({ mesaId });
      await recargar();
    },
  };
}
