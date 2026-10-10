import cocinaService from '../services/cocinaService';
import useOrderResource from './useOrderResource';
export default function usePedidosCocina() {
  const { data, ...state } = useOrderResource(cocinaService.getPedidosActivos, 5000);
  return { pedidos: data || [], ...state };
}
