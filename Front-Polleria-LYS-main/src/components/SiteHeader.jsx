import { ShoppingCart } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'
import { useState } from 'react';
import * as authService from '../services/authService';
export default function SiteHeader() {
  const { cartCount, openCart } = useCart()
  const location = useLocation();
  const navigate = useNavigate();

const handleLogout = () => {
  authService.logout();
  setMenuPath(null);
  navigate('/login');
};
  const [menuPath, setMenuPath] = useState(null);

  const user = authService.getCurrentUser();
  const canAccess = (roles) => Boolean(user && roles.includes(user.rol));

  const initials = user
    ? `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase() || 'U'
    : '';

  const menuOpen = menuPath === location.key;

  return (
    <nav className="lys-nav">
      <div className="lys-nav-inner">
        <NavLink
          to="/"
          className="lys-brand-link"
        >
          <span className="lys-logo-badge">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN453N6mpAhn09UKYb6yIXeJS43lFNZ41j7YQtRNGHgbZONCxXKd-xog&s=10"
              alt="Leña y Sabores"
              className="lys-logo-img"
            />
          </span>
          <span className="font-display lys-brand-title">
            Leña y Sabores
          </span>
        </NavLink>

        <div className="lys-navlinks">
          <NavLink to="/" end className={({ isActive }) => `lys-navlink ${isActive ? 'active' : ''}`}>
            Inicio
          </NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => `lys-navlink ${isActive ? 'active' : ''}`}>
            Menú
          </NavLink>
          {canAccess(['cliente',]) && (
            <NavLink to="/pedidos" className={({ isActive }) => `lys-navlink ${isActive ? 'active' : ''}` }> Mis pedidos</NavLink>
          )}
          {canAccess(['mesera', 'admin']) && (
            <NavLink to="/mesas" className={({ isActive }) => `lys-navlink ${isActive ? 'active' : ''}`}> Mesas </NavLink>
          )}
          {canAccess(['cocina', 'admin']) && (
            <NavLink to="/cocina" className={({ isActive }) =>  `lys-navlink ${isActive ? 'active' : ''}` } > Cocina</NavLink>
          )}
          {canAccess(['admin']) && (
            <><NavLink to="/caja" className={({ isActive }) => `lys-navlink ${isActive ? 'active' : ''}` }> Caja</NavLink>

              <NavLink to="/dashboard"className={({ isActive }) =>`lys-navlink ${isActive ? 'active' : ''}`}> Dashboard</NavLink> </>
          )}
          {user ? (
            <div
              className="lys-account"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setMenuPath(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setMenuPath(null);
                  e.currentTarget.querySelector('button')?.focus();
                }
              }}
            >
              <button
                type="button"
                className="lys-account-avatar"
                onClick={() => setMenuPath(menuOpen ? null : location.key)}
                aria-label="Opciones de mi cuenta"
                aria-expanded={menuOpen}
                aria-controls="lys-account-dropdown"
              >
                {initials}
              </button>

              {menuOpen && (
                <div
                  id="lys-account-dropdown"
                  className="lys-account-dropdown"
                >
                  <div className="lys-account-info">
                    <strong>{user.nombre} {user.apellido}</strong>
                    <span>{user.email}</span>
                  </div>

                  <NavLink to="/profile" className="lys-account-link" onClick={() => setMenuPath(null)}>
                    Mi perfil
                  </NavLink>

                  <button
            type="button"
            className="profile-menu-item danger"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `lys-login ${isActive ? 'active' : ''}`} >
              Iniciar sesión
            </NavLink>
          )}
          <button
            type="button"
            onClick={openCart}
            className="lys-cart-button"
            aria-label="Ver carrito"
          >
            <ShoppingCart size={22} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="badge-count lys-cart-count">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
