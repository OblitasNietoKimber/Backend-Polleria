import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import orderService, { ORDER_STATUS_STEPS } from '../services/orderService'
import { money } from '../utils/currency'
import OrderDeliveryInfo from '../components/orders/OrderDeliveryInfo'
import OrderStatusBadge from '../components/orders/OrderStatusBadge'
import OrderStatusStepper from '../components/orders/OrderStatusStepper'
import '../styles/pedidos.css'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState({ id: null, revision: -1, order: null, history: [], error: '' })
  const order = result.id === id ? result.order : null
  useEffect(() => {
    let active = true
    orderService.getOrderById(id).then(async order => {
      const history = order ? await orderService.getOrderHistory(order.databaseId) : []
      if (active) setResult({ id, revision, order, history, error: '' })
    }).catch(error => { if (active) setResult({ id, revision, order: null, history: [], error: error.message }) })
    return () => { active = false }
  }, [id, revision])
  const [copied, setCopied] = useState(false)

  if (result.id !== id || result.revision !== revision) return <p role="status">Cargando pedido...</p>
  if (result.error) return <p role="alert">{result.error}</p>

  if (!order) {
    return (
      <section className="orders-page">
        <p>No encontramos ese pedido.</p>
        <Link to="/pedidos" className="btn-ember">
          Volver a mis pedidos
        </Link>
      </section>
    )
  }

  const date = new Date(order.createdAt).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  function handleCopy() {
    navigator.clipboard.writeText(order.id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="orders-page">
      <button onClick={() => navigate('/pedidos')} className="lys-navlink order-detail-back">
        <ArrowLeft size={15} /> Mis pedidos
      </button>

      <div className="order-detail-header">
        <div>
          <h1 className="font-display order-detail-id">
            Pedido {order.id}
            <button
              className="copy-id-btn"
              onClick={handleCopy}
              aria-label="Copiar número de pedido"
              title="Copiar número de pedido"
            >
              {copied ? <Check size={16} color="#2E7D46" /> : <Copy size={16} />}
            </button>
          </h1>
          <p className="order-card-date">{date}</p>
        </div>
        <OrderStatusBadge order={order} />
      </div>

      <OrderStatusStepper order={order} />

      <div className="order-items-card">
        <div className="order-items-card-title font-mono">COMANDA · LEÑA Y SABORES</div>
        <div className="order-items-card-body">
          {order.items.map((item) => (
            <div key={item.id} className="order-item-row font-mono">
              <span>
                {item.qty}× {item.name}
              </span>
              <span>{money(item.qty * item.price)}</span>
            </div>
          ))}
          <div className="order-item-row font-mono subtotal">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="order-item-row font-mono subtotal">
            <span>Envío ({order.deliveryType === 'delivery' ? 'delivery' : 'recojo en tienda'})</span>
            <span>{order.shipping === 0 ? 'Gratis' : money(order.shipping)}</span>
          </div>
          <div className="order-item-row font-mono total">
            <span>TOTAL</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      </div>
      <OrderDeliveryInfo order={order} />
      <section className="order-items-card" aria-label="Historial de estados">
        <div className="order-items-card-title font-mono">HISTORIAL DEL PEDIDO</div>
        <ol className="order-status-history">
          {result.history.map(entry => (
            <li key={entry.id}>
              <strong>{ORDER_STATUS_STEPS.find(step => step.key === entry.estado_id)?.label || (entry.estado_id === 'cancelado' ? 'Cancelado' : entry.estado_id)}</strong>
              <time dateTime={entry.cambiado_en}>{new Date(entry.cambiado_en).toLocaleString('es-PE')}</time>
            </li>
          ))}
        </ol>
        <button className="lys-navlink" onClick={() => setRevision(value => value + 1)}>Actualizar pedido e historial</button>
      </section>
    </section>
  )
}