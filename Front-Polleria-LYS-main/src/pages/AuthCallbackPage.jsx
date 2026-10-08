import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export default function AuthCallbackPage() {
  const { user } = useAuth();
  const routes = { cliente: '/profile', mesera: '/mesas', cocina: '/cocina', caja: '/caja', admin: '/dashboard' };
  if (user) return <Navigate to={routes[user.rol] || '/profile'} replace />;
  return <div role="alert"><p>No se pudo completar el inicio de sesión.</p><Link to="/login">Intentar nuevamente</Link></div>;
}
