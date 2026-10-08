import { useEffect, useState } from 'react'
import orderService from '../services/orderService'

export function useLiveOrderStatus(order, intervalMs = 15000) {
  const [status, setStatus] = useState(() => (order ? orderService.getOrderStatus(order) : null))

  useEffect(() => {
    if (!order) return
    setStatus(orderService.getOrderStatus(order))
    const id = setInterval(() => {
      setStatus(orderService.getOrderStatus(order))
    }, intervalMs)
    return () => clearInterval(id)
  }, [order, intervalMs])

  return status
}