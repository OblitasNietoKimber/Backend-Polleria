import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money } from '../utils/currency'

export default function CartDrawer() {
  const navigate = useNavigate()
  const { cartOpen, closeCart, cartItems, removeItem, setQty, subtotal } = useCart()

  function handleCheckout() {
    closeCart()
    navigate('/checkout/entrega')
  }

  return (
    <>
      <div className={`cart-backdrop ${cartOpen ? 'open' : ''}`} onClick={closeCart} />
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <span className="font-display cart-drawer-title">Tu carrito</span>
          <button onClick={closeCart} className="cart-drawer-close" aria-label="Cerrar carrito">
            <X size={20} />
          </button>
        </div>
        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">Aún no agregaste platos.</div>
          ) : (
            cartItems.map(({ product, qty }) => (
              <div key={product.id} className="cart-drawer-item">
                <img src={product.image} alt={product.name} className="cart-drawer-item-img" />
                <div className="cart-drawer-item-info">
                  <div className="cart-drawer-item-name">{product.name}</div>
                  <div className="cart-drawer-item-controls">
                    <button className="qty-btn" onClick={() => setQty(product.id, qty - 1)} aria-label="Reducir cantidad">
                      <Minus size={13} />
                    </button>
                    <span className="font-mono cart-drawer-item-qty">{qty}</span>
                    <button className="qty-btn" onClick={() => setQty(product.id, qty + 1)} aria-label="Aumentar cantidad">
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="cart-drawer-item-remove"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="font-mono cart-drawer-subtotal">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <button className="btn-ember cart-drawer-checkout-btn" onClick={handleCheckout}>
              Continuar compra
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
