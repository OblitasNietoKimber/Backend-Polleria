import { useNavigate } from 'react-router-dom'
import OrderConfirmation from '../components/OrderConfirmation'
import { useCart } from '../context/CartContext'

export default function ConfirmacionPage() {
  const navigate = useNavigate()
  const { form, orderNumber, resetAll } = useCart()

  function handleReset() {
    resetAll()
    navigate('/')
  }

  return <OrderConfirmation name={form.name} orderNumber={orderNumber} onReset={handleReset} />
}
