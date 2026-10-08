import { useEffect, useState } from 'react'
import orderService from '../services/orderService'
export function useLiveOrderStatus(order, intervalMs = 15000) {
  const [latest, setLatest] = useState(null)
  useEffect(() => {
    if (!order) return
    let active = true
    const id = setInterval(() => {
      orderService.getOrderById(order.id).then(row => { if (active) setLatest(row) }).catch(() => {})
    }, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [order, intervalMs])
  return orderService.getOrderStatus(latest?.id === order?.id ? latest : order || {})
}
