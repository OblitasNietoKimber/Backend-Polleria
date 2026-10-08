import { Calendar, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS } from '../../data/products'
import { money } from '../../utils/currency'
import OrderStatusBadge from './OrderStatusBadge'

export default function OrderCard({ order }) {
  const navigate = useNavigate()

  const date = new Date(order.createdAt).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const [firstItem, ...restItems] = order.items
  const firstProduct = PRODUCTS.find((p) => p.id === firstItem.id)
  const otherNames = restItems.map((item) => item.name).join(', ')

  return (
    <button className="order-card" onClick={() => navigate(`/pedidos/${order.id}`)}>
      <span className="order-card-icon">
        <FileText size={18} />
      </span>

      <div className="order-card-info">
        <span className="order-card-id font-mono">{order.id}</span>
        <span className="order-card-date">
          <Calendar size={12} /> {date}
        </span>
      </div>

      <span className="order-card-divider" />

      <div className="order-card-product">
        {firstProduct?.image && (
          <img src={firstProduct.image} alt={firstItem.name} className="order-card-thumb" />
        )}
        <div className="order-card-product-text">
          <span className="order-card-product-name">{firstItem.qty}× {firstItem.name}</span>
          {otherNames && <span className="order-card-product-extra">+ {otherNames}</span>}
          <span className="order-card-count-tag">{order.items.length} producto{order.items.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="order-card-status-col">
        <OrderStatusBadge order={order} />
        <span className="order-card-total-label">Total</span>
        <span className="order-card-total font-mono">{money(order.total)}</span>
      </div>

      <span className="order-card-cta">Ver detalle →</span>
    </button>
  )
}