import { ORDER_STATUS_STEPS } from '../../services/orderService'
import { useLiveOrderStatus } from '../../hooks/useLiveOrderStatus'

export default function OrderStatusBadge({ order }) {
  const status = useLiveOrderStatus(order)
  const label = ORDER_STATUS_STEPS.find((s) => s.key === status)?.label

  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}   