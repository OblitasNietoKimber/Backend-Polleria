import { X } from 'lucide-react'

import { money } from '../utils/currency'
import { useCart } from '../context/CartContext'

export default function ProductDetailModal({ product, onClose }) {
  const { addToCart } = useCart()

  if (!product) return null

  function handleAdd() {
    addToCart(product.id)
    onClose()
  }

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal-panel" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="product-modal-close" aria-label="Cerrar detalle del producto">
          <X size={16} />
        </button>
        <div className="product-modal-media">
          <img
            src={product.image}
            alt={product.name}
            className={product.available ? '' : 'is-unavailable'}
          />
        </div>
        <div className="product-modal-body">
          {!product.available && <span className="font-mono product-modal-unavailable-tag">NO DISPONIBLE</span>}
          <h3 className="font-display product-modal-title">{product.name}</h3>
          <p className="product-modal-desc">{product.desc}</p>
          <div className="product-modal-footer">
            <span className="font-mono product-modal-price">{money(product.price)}</span>
            <button className="btn-ember" disabled={!product.available} onClick={handleAdd}>
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
