import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DELIVERY_COST } from '../data/products'
import { getProduct } from '../services/productService'
import { generateOrderNumber } from '../utils/orderNumber'
import orderService from '../services/orderService'

const CartContext = createContext(null)
const CART_STORAGE_KEY = 'lys-cart'
const DELIVERY_STORAGE_KEY = 'lys-checkout-delivery'
const PAYMENT_STORAGE_KEY = 'lys-checkout-payment'
const ORDER_STORAGE_KEY = 'lys-order-number'

const EMPTY_FORM = { name: '', address: '', reference: '', phone: '' }
// Los datos de tarjeta NUNCA se guardan en localStorage (ni completos ni parciales):
// viven solo en memoria mientras dura la sesión de pago.
const EMPTY_CARD = { number: '', name: '', expiry: '', cvv: '' }

function readStoredCart() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function readStoredDelivery() {
  if (typeof window === 'undefined') return { deliveryType: 'delivery', form: EMPTY_FORM }
  try {
    const raw = window.localStorage.getItem(DELIVERY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : { deliveryType: 'delivery', form: EMPTY_FORM }
  } catch {
    return { deliveryType: 'delivery', form: EMPTY_FORM }
  }
}

function readStoredPayment() {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(PAYMENT_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function readStoredOrderNumber() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ORDER_STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readStoredCart)
  const [products, setProducts] = useState({})
  const [catalogState, setCatalogState] = useState({ ids: null, error: '' })
  const cartIds = Object.keys(cart).sort().join(',')
  const cartLoading = Boolean(cartIds) && catalogState.ids !== cartIds
  const cartError = catalogState.ids === cartIds ? catalogState.error : ''
  const [cartOpen, setCartOpen] = useState(false)
  const [deliveryType, setDeliveryType] = useState(() => readStoredDelivery().deliveryType)
  const [form, setForm] = useState(() => readStoredDelivery().form)
  const [payment, setPayment] = useState(readStoredPayment)
  const [orderNumber, setOrderNumber] = useState(readStoredOrderNumber)
  const [card, setCard] = useState(EMPTY_CARD)
  const [cardReceipt, setCardReceipt] = useState(null)

  useEffect(() => {
    let active = true
    const ids = cartIds ? cartIds.split(',') : []
    Promise.all(ids.map(getProduct)).then(rows => {
      if (!active) return
      setProducts(Object.fromEntries(rows.filter(Boolean).map(product => [product.id, product])))
      setCatalogState({ ids: cartIds, error: rows.some(product => !product) ? 'Un producto del carrito ya no está en el catálogo.' : '' })
    }).catch(error => {
      if (active) setCatalogState({ ids: cartIds, error: error.message })
    })
    return () => { active = false }
  }, [cartIds])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // localStorage no disponible (modo privado, cuotas, etc.)
    }
  }, [cart])

  useEffect(() => {
    try {
      window.localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify({ deliveryType, form }))
    } catch {
      // localStorage no disponible (modo privado, cuotas, etc.)
    }
  }, [deliveryType, form])

  useEffect(() => {
    try {
      window.localStorage.setItem(PAYMENT_STORAGE_KEY, payment)
    } catch {
      // localStorage no disponible (modo privado, cuotas, etc.)
    }
  }, [payment])

  useEffect(() => {
    try {
      if (orderNumber) window.localStorage.setItem(ORDER_STORAGE_KEY, orderNumber)
      else window.localStorage.removeItem(ORDER_STORAGE_KEY)
    } catch {
      // localStorage no disponible (modo privado, cuotas, etc.)
    }
  }, [orderNumber])

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: products[id], qty }))
        .filter((item) => item.product && item.qty > 0),
    [cart, products]
  )
  const cartCount = cartItems.reduce((total, item) => total + item.qty, 0)
  const subtotal = cartItems.reduce((total, item) => total + item.qty * item.product.price, 0)
  const shipping = deliveryType === 'delivery' && subtotal > 0 ? DELIVERY_COST : 0
  const total = subtotal + shipping

  function openCart() {
    setCartOpen(true)
  }

  function closeCart() {
    setCartOpen(false)
  }

  function addToCart(product, qty = 1) {
    const id = typeof product === 'object' ? product.id : product
    if (typeof product === 'object') {
      if (!product.available) return
      setProducts(current => ({ ...current, [id]: product }))
    }
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + qty }))
  }

  function removeItem(id) {
    setCart((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function setQty(id, qty) {
    setCart((current) => {
      const next = { ...current }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  function updateFormField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateCardField(field, value) {
    setCard((current) => ({ ...current, [field]: value }))
  }

  function clearCard() {
    setCard(EMPTY_CARD)
  }

  async function confirmOrder() {
  const number = generateOrderNumber()

  await orderService.createOrder({
    id: number,
    items: cartItems,
    subtotal,
    shipping,
    total,
    deliveryType,
    form,
    payment,
    paymentReceipt: cardReceipt,
  })

  setOrderNumber(number)
  setCart({})
  clearCard()
  setCardReceipt(null)
  return number
}

  function resetAll() {
    setCart({})
    setDeliveryType('delivery')
    setForm(EMPTY_FORM)
    setPayment('')
    setOrderNumber(null)
    clearCard()
    setCardReceipt(null)
  }

  const value = {
    cartLoading,
    cartError,
    cartItems,
    cartCount,
    subtotal,
    shipping,
    total,
    cartOpen,
    openCart,
    closeCart,
    addToCart,
    removeItem,
    setQty,
    deliveryType,
    setDeliveryType,
    form,
    updateFormField,
    payment,
    setPayment,
    card,
    updateCardField,
    clearCard,
    cardReceipt,
    setCardReceipt,
    orderNumber,
    confirmOrder,
    resetAll,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider')
  }
  return context
}
