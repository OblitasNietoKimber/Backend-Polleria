import { MapPin, Store } from 'lucide-react'

export default function DeliveryForm({ deliveryType, form, errors, onTypeChange, onFormChange, onContinue }) {
  function handlePhoneChange(event) {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 9)
    if (digitsOnly && digitsOnly[0] !== '9') return
    onFormChange('phone', digitsOnly)
  }

  return (
    <div>
      <h2 className="font-display checkout-form-title">Datos de entrega</h2>
      <div className="delivery-type-group">
        <button
          onClick={() => onTypeChange('delivery')}
          className={`chip delivery-type-chip ${deliveryType === 'delivery' ? 'active' : ''}`}
        >
          <MapPin size={16} /> Delivery
        </button>
        <button
          onClick={() => onTypeChange('pickup')}
          className={`chip delivery-type-chip ${deliveryType === 'pickup' ? 'active' : ''}`}
        >
          <Store size={16} /> Recojo en tienda
        </button>
      </div>
      <div className="delivery-form-grid">
        <label className="checkout-field-label">
          Nombre completo
          <input
            className={`lys-input ${errors.name ? 'err' : ''}`}
            value={form.name}
            onChange={(event) => onFormChange('name', event.target.value)}
            placeholder="Ej. María Torres"
            maxLength={50}
          />
          {errors.name && <span className="checkout-field-error">{errors.name}</span>}
        </label>
        {deliveryType === 'delivery' && (
          <>
            <label className="checkout-field-label">
              Dirección de entrega
              <input
                className={`lys-input ${errors.address ? 'err' : ''}`}
                value={form.address}
                onChange={(event) => onFormChange('address', event.target.value)}
                placeholder="Av. Ejemplo 123, distrito"
                maxLength={50}
              />
              {errors.address && <span className="checkout-field-error">{errors.address}</span>}
            </label>
            <label className="checkout-field-label">
              Referencia (opcional)
              <input
                className="lys-input"
                value={form.reference}
                onChange={(event) => onFormChange('reference', event.target.value)}
                placeholder="Ej. frente al parque, edificio azul"
                maxLength={50}
              />
            </label>
          </>
        )}
        <label className="checkout-field-label">
          Teléfono de contacto
          <input
            className={`lys-input ${errors.phone ? 'err' : ''}`}
            value={form.phone}
            onChange={handlePhoneChange}
            type="tel"
            inputMode="numeric"
            maxLength={9}
            placeholder="9XXXXXXXX"
          />
          {errors.phone && <span className="checkout-field-error">{errors.phone}</span>}
        </label>
      </div>
      <button className="btn-ember checkout-submit-btn" onClick={onContinue}>
        Continuar al pago
      </button>
    </div>
  )
}