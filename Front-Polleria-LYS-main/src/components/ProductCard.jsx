import { money } from '../utils/currency'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product, onSelect }) {
  const { addToCart } = useCart()

  function handleAdd(event) {
    event.stopPropagation()
    addToCart(product.id)
  }

  return (
    <div className="ticket-card" onClick={() => onSelect?.(product)}>
      <div className={`product-card-media ${!product.available ? 'is-unavailable' : ''}`}>
        <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="product-card-image" />
      </div>

      <div className="product-card-body">
        {!product.available && <span className="font-mono product-card-unavailable-tag">NO DISPONIBLE</span>}

        <div className={`font-display product-card-name ${!product.available ? 'is-unavailable' : ''}`}>
          {product.name}
        </div>

        <p className="product-card-desc">
          {product.desc.slice(0, 70)}
          {product.desc.length > 70 ? '…' : ''}
        </p>

        <div className="product-card-footer">
          <span className="font-mono product-card-price">{money(product.price)}</span>

          <button className="btn-outline product-card-add-btn" disabled={!product.available} onClick={handleAdd}>
            {product.available ? 'Agregar' : 'Agotado'}
          </button>
        </div>
      </div>
    </div>
  )
}
