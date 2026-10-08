import OrderCard from './OrderCard'

export default function OrderHistoryList({ orders }) {
  return (
    <div className="orders-list">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}