import { useEffect, useState } from 'react'
import orderService from '../services/orderService'
export function useLiveOrderStatus(order, intervalMs = 15000) {
  const [latest, setLatest] = useState(null)
  useEffect(() => {
    if (!order) return
    let active = true
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      orderService.getOrderState(order.id).then(row => { if (active && row) setLatest({ id: order.id, status: row.estado_id }) }).catch(() => {})
    }, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [order, intervalMs])
  return orderService.getOrderStatus(latest?.id === order?.id ? latest : order || {})
}
