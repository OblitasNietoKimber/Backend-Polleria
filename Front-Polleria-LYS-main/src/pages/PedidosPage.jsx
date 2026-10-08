import { useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import orderService from '../services/orderService'
import OrderHistoryList from '../components/orders/OrderHistoryList'
import '../styles/pedidos.css'

export default function PedidosPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setOrders(orderService.getOrders())
    setLoading(false)
  }, [])

  return (
    <section className="orders-page">
      <div className="orders-page-header">
        <h1 className="font-display">Mis pedidos</h1>
        <p>Aquí puedes ver el estado y el historial de todo lo que has pedido.</p>
      </div>

      <div className="orders-banner">
        <span className="orders-banner-eyebrow">GRACIAS POR ELEGRNOS</span>
        <h2 className="orders-banner-title font-display">
          Cada pedido tuyo <em>alimenta</em><br />nuestra tradición.
        </h2>
      </div>

      {loading ? (
        <div className="orders-skeleton">
          <div className="orders-skeleton-card" />
          <div className="orders-skeleton-card" />
          <div className="orders-skeleton-card" />
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <PackageSearch size={40} strokeWidth={1.4} color="var(--ember)" />
          <p>Todavía no tienes pedidos.</p>
          <Link to="/catalogo" className="btn-ember">
            Ver el menú
          </Link>
        </div>
      ) : (
        <OrderHistoryList orders={orders} />
      )}
    </section>
  )
}