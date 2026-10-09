import { Check } from 'lucide-react'
import { ORDER_STATUS_STEPS } from '../../services/orderService'
import { useLiveOrderStatus } from '../../hooks/useLiveOrderStatus'

export default function OrderStatusStepper({ order }) {
  const currentStatus = useLiveOrderStatus(order)

  if (currentStatus === 'cancelado') return <p role="status">Este pedido fue cancelado.</p>

  const steps =
    order.deliveryType === 'delivery'
      ? ORDER_STATUS_STEPS
      : ORDER_STATUS_STEPS.filter((s) => s.key !== 'camino')

  const currentIndex = steps.findIndex((s) => s.key === currentStatus)

  return (
    <div className="status-stepper">
      {steps.map((step, index) => {
        const isDone = index < currentIndex
        const isActive = index === currentIndex
        return (
          <div key={step.key} className="status-stepper-item">
            <div className="status-stepper-line-wrap">
              <span className={`status-stepper-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                {isDone ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              {index < steps.length - 1 && (
                <span className={`status-stepper-line ${isDone ? 'done' : ''}`} />
              )}
            </div>
            <span className={`status-stepper-label ${isActive ? 'active' : ''}`}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}