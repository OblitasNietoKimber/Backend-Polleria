import { CreditCard, Smartphone, Wallet } from 'lucide-react'
import CardPaymentForm from './CardPaymentForm'

const METHODS = [
  { id: 'efectivo', label: 'Efectivo', desc: 'Pagas al recibir tu pedido.', icon: Wallet },
  { id: 'tarjeta', label: 'Tarjeta', desc: 'Débito o crédito, contra entrega o en tienda.', icon: CreditCard },
  { id: 'yape', label: 'Yape / Plin', desc: 'Pago digital mediante QR.', icon: Smartphone },
]

export default function PaymentMethod({
  payment,
  onChange,
  card,
  cardErrors,
  processing,
  gatewayError,
  onCardChange,
  onBack,
  onContinue,
}) {
  return (
    <div>
      <h2 className="font-display checkout-form-title">Método de pago</h2>
      <div className="payment-methods-grid">
        {METHODS.map((method) => (
          <button
            key={method.id}
            onClick={() => onChange(method.id)}
            disabled={processing}
            className={`payment-method-option ${payment === method.id ? 'active' : ''}`}
          >
            <method.icon size={22} color={payment === method.id ? 'var(--ember)' : 'var(--smoke)'} strokeWidth={1.7} />
            <div>
              <div className="payment-method-info-title">{method.label}</div>
              <div className="payment-method-info-desc">{method.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {payment === 'tarjeta' && (
        <CardPaymentForm
          card={card}
          errors={cardErrors}
          processing={processing}
          gatewayError={gatewayError}
          onChange={onCardChange}
        />
      )}

      <div className="checkout-actions">
        <button className="btn-outline checkout-actions-back" onClick={onBack} disabled={processing}>
          Atrás
        </button>
        <button className="btn-ember checkout-actions-primary" disabled={!payment || processing} onClick={onContinue}>
          {processing ? 'Procesando…' : 'Ver resumen'}
        </button>
      </div>
    </div>
  )
}
