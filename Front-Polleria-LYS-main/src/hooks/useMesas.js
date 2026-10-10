import { useMemo } from 'react';
import useOrderResource from './useOrderResource';
import mesaService from '../services/mesaService';

export default function useMesas(zona = 'salon_principal') {
  const { data, loading, error, recargar } = useOrderResource(mesaService.getMesas);
  const listaCompleta = useMemo(() => data || [], [data]);

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
