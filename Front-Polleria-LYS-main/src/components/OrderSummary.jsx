export default function OrderSummary({ items, subtotal, shipping, total, deliveryType, form, payment, cardReceipt, money, onBack, onConfirm }) {
  return (
    <div>
      <h2 className="font-display checkout-form-title">Resumen de tu compra</h2>
      <div className="order-ticket">
        <div className="order-ticket-header">COMANDA · LEÑAS &amp; SABORES</div>
        <div className="order-ticket-body">
          {items.map(({ product, qty }) => (
            <div key={product.id} className="font-mono order-ticket-line">
              <span>
                {qty}× {product.name}
              </span>
              <span>{money(qty * product.price)}</span>
            </div>
          ))}
          <div className="font-mono order-ticket-summary-row">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="font-mono order-ticket-summary-row">
            <span>Envío ({deliveryType === 'delivery' ? 'delivery' : 'recojo en tienda'})</span>
            <span>{shipping === 0 ? 'Gratis' : money(shipping)}</span>
          </div>
          <div className="font-mono order-ticket-total">
            <span>TOTAL</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>
      <div className="order-details">
        <div>
          <strong>Entrega:</strong> {form.name} · {form.phone}
        </div>
        <div>{deliveryType === 'delivery' ? `${form.address}${form.reference ? ` (${form.reference})` : ''}` : 'Recojo en tienda'}</div>
        <div>
          <strong>Pago:</strong>{' '}
          {payment === 'efectivo' && 'Efectivo'}
          {payment === 'yape' && 'Yape / Plin'}
          {payment === 'tarjeta' &&
            (cardReceipt
              ? `${cardReceipt.brandLabel} terminada en ${cardReceipt.last4} · Aprobado (${cardReceipt.authCode})`
              : 'Tarjeta')}
        </div>
      </div>
      <div className="checkout-actions">
        <button className="btn-outline checkout-actions-back" onClick={onBack}>
          Atrás
        </button>
        <button className="btn-ember checkout-actions-primary" onClick={onConfirm}>
          Confirmar pedido
        </button>
      </div>
    </div>
  )
}
