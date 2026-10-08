import { CreditCard, MapPin, Phone, User } from 'lucide-react'

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape / Plin',
}

export default function OrderDeliveryInfo({ order }) {
  const { form, deliveryType, payment } = order

  return (
    <div className="delivery-info">
      <h2 className="delivery-info-title">Entrega y pago</h2>
      <div className="delivery-info-row">
        <User size={16} color="var(--ember)" />
        <span>{form.name} · {form.phone}</span>
      </div>
      <div className="delivery-info-row">
        <MapPin size={16} color="var(--ember)" />
        <span>
          {deliveryType === 'delivery'
            ? `${form.address}${form.reference ? ` (${form.reference})` : ''}`
            : 'Recojo en tienda'}
        </span>
      </div>
      <div className="delivery-info-row">
        <CreditCard size={16} color="var(--ember)" />
        <span>{PAYMENT_LABELS[payment] || payment}</span>
      </div>
    </div>
  )
}