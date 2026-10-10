import { useCallback } from 'react';
import orderService from '../services/orderService';
import useOrderResource from './useOrderResource';
export function useLiveOrderStatus(order, intervalMs = 10000) {
  const id = order?.id;
  const load = useCallback(async () => id ? { id, ...await orderService.getOrderState(id) } : null, [id]);
  const { data } = useOrderResource(load, intervalMs);
  return data?.id === id && data.estado_id ? data.estado_id : orderService.getOrderStatus(order || {});
}
