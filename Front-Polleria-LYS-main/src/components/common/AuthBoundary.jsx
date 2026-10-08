import { useAuth } from '../../hooks/useAuth';
import { restoreSession } from '../../services/authService';
export default function AuthBoundary({ children }) {
  const { loading, error } = useAuth();
  if (loading) return <p role="status">Restaurando sesión...</p>;
  if (error) return <div role="alert"><p>{error}</p><button onClick={() => void restoreSession().catch(() => {})}>Reintentar conexión</button></div>;
  return children;
}
