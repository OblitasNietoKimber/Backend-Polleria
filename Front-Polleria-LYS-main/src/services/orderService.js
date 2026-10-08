import cocinaService from './cocinaService'

const STORAGE_KEY = 'lys-client-orders'

export const ORDER_STATUS_STEPS = [
  { key: 'recibido', label: 'Recibido' },
  { key: 'preparacion', label: 'En preparación' },
  { key: 'listo', label: 'Listo' },
  { key: 'camino', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' },
]

function readOrders() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeOrders(orders) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // localStorage no disponible (modo privado, cuotas, etc.)
  }
}

function getOrders() {
  return readOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function getOrderById(id) {
  return readOrders().find((order) => order.id === id) || null
}

function createOrder({ id, items, subtotal, shipping, total, deliveryType, form, payment }) {
  const order = {
    id,
    items: items.map(({ product, qty }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
    })),
    subtotal,
    shipping,
    total,
    deliveryType,
    form,
    payment,
    createdAt: new Date().toISOString(),
  }

  const orders = readOrders()
  orders.push(order)
  writeOrders(orders)
  return order
}

// Traduce el estado real de cocina (fuente compartida "lys_pedidos") al
// vocabulario que usa el cliente en su stepper.
function mapKitchenStatus(pedidoCocina, deliveryType) {
  if (!pedidoCocina) return 'recibido'

  switch (pedidoCocina.estadoCocina) {
    case 'nuevo':
      return 'recibido'
    case 'en_preparacion':
      return 'preparacion'
    case 'listo':
      // Si es delivery, "listo" en cocina significa que ya salió a reparto.
      // Si es recojo en tienda, se queda en "listo" hasta que lo retiren.
      return deliveryType === 'delivery' ? 'camino' : 'listo'
    case 'entregado':
      return 'entregado'
    default:
      return 'recibido'
  }
}

// Estado en tiempo real: ya no se simula con un cronómetro, se lee
// directamente de lo que cocina/caja van actualizando.
function getOrderStatus(order) {
  const pedidoCocina = cocinaService.getPedidos().find((p) => p.id === order.id)
  return mapKitchenStatus(pedidoCocina, order.deliveryType)
}

export default {
  getOrders,
  getOrderById,
  createOrder,
  getOrderStatus,
}