import { Outlet } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import CartDrawer from '../components/CartDrawer'
import { CartProvider } from '../context/CartContext'

export default function MainLayout() {
  return (
    <CartProvider>
      <div className="app-shell">
        <SiteHeader />
        <Outlet />
        <CartDrawer />
      </div>
    </CartProvider>
  )
}
