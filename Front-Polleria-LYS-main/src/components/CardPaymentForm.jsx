import { Lock } from 'lucide-react'
import { BRAND_LABELS, detectCardBrand, formatCardNumber, formatCvv, formatExpiry } from '../utils/cardValidation'

export default function CardPaymentForm({ card, errors, processing, gatewayError, onChange }) {
  const digits = card.number.replace(/\D/g, '')
  const brand = detectCardBrand(digits)

  function handleNumberChange(event) {
    onChange('number', formatCardNumber(event.target.value))
  }

  function handleExpiryChange(event) {
    onChange('expiry', formatExpiry(event.target.value))
  }

  function handleCvvChange(event) {
    onChange('cvv', formatCvv(event.target.value))
  }

  return (
    <div className="card-payment-form" aria-busy={processing}>
      <div className="card-payment-head">
        <span className="card-payment-title">Datos de la tarjeta</span>
        <span className="card-payment-secure">
          <Lock size={12} /> Conexión segura
        </span>
      </div>

      <div className="card-payment-grid">
        <label className="checkout-field-label">
          Número de tarjeta
          <div className="card-number-wrap">
            <input
              className={`lys-input ${errors.number ? 'err' : ''}`}
              value={card.number}
              onChange={handleNumberChange}
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              disabled={processing}
              autoComplete="cc-number"
            />
            {brand && <span className="card-brand-badge">{BRAND_LABELS[brand]}</span>}
          </div>
          {errors.number && <span className="checkout-field-error">{errors.number}</span>}
        </label>

        <label className="checkout-field-label">
          Nombre del titular
          <input
            className={`lys-input ${errors.name ? 'err' : ''}`}
            value={card.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Como figura en la tarjeta"
            disabled={processing}
            autoComplete="cc-name"
          />
          {errors.name && <span className="checkout-field-error">{errors.name}</span>}
        </label>

        <div className="card-payment-row">
          <label className="checkout-field-label">
            Vencimiento
            <input
              className={`lys-input ${errors.expiry ? 'err' : ''}`}
              value={card.expiry}
              onChange={handleExpiryChange}
              inputMode="numeric"
              placeholder="MM/AA"
              disabled={processing}
              autoComplete="cc-exp"
            />
            {errors.expiry && <span className="checkout-field-error">{errors.expiry}</span>}
          </label>

          <label className="checkout-field-label">
            CVV
            <input
              className={`lys-input ${errors.cvv ? 'err' : ''}`}
              value={card.cvv}
              onChange={handleCvvChange}
              inputMode="numeric"
              placeholder={brand === 'amex' ? '0000' : '000'}
              disabled={processing}
              autoComplete="cc-csc"
            />
            {errors.cvv && <span className="checkout-field-error">{errors.cvv}</span>}
          </label>
        </div>
      </div>

      {gatewayError && <div className="card-gateway-error">{gatewayError}</div>}

      {processing && (
        <div className="card-processing">
          <span className="card-spinner" /> Procesando pago con el emisor de tu tarjeta…
        </div>
      )}
    </div>
  )
}
