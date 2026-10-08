import { useAuth } from '../../hooks/useAuth';
import { restoreSession } from '../../services/authService';
import { configurationError } from '../../lib/insforge';
export default function AuthBoundary({ children }) {
  const { loading, error } = useAuth();
  if (configurationError) return (
    <div className="login-page">
      <div className="login-page__card" role="alert">
        <h1>Configura la conexión con InsForge</h1>
        <p>{configurationError}</p>
        <ol>
          <li>Copia <code>.env.example</code> como <code>.env.local</code> dentro de <code>Front-Polleria-LYS-main</code>.</li>
          <li>Completa la clave pública desde InsForge: Install → API Keys.</li>
          <li>Detén el servidor y vuelve a ejecutar <code>npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
  if (loading) return <p role="status">Restaurando sesión...</p>;
  if (error) return <div role="alert"><p>{error}</p><button onClick={() => void restoreSession().catch(() => {})}>Reintentar conexión</button></div>;
  return children;
}
