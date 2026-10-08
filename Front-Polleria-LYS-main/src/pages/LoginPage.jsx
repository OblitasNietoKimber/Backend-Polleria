import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authService from '../services/authService';
import { validateLoginForm } from '../services/validators';
import Logo from '../components/common/Logo';
import '../styles/login.css';

function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setFormError('');

    const fieldErrors = validateLoginForm(form);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
  const loggedUser = await authService.login(form);
  const rol = loggedUser.rol?.toLowerCase();

  const routesByRole = {
    cliente: '/',
    mesera: '/mesas',
    cocina: '/cocina',
    admin: '/dashboard',
  };

  navigate(routesByRole[rol] || '/profile', { replace: true });
} catch (err) {
  setFormError(
    err.message || 'No se pudo iniciar sesión. Inténtalo nuevamente.'
  );
} finally {
  setLoading(false);
}
  }

  return (
    <div className="lys-root login-page">
      <div className="login-page__card">
        <div className="login-page__logo">
          <Logo size="md" />
        </div>

        <h1 className="font-display login-page__title">
          Bienvenido de vuelta
        </h1>

        <p className="login-page__subtitle">
          Inicia sesión para continuar en Leñas y Sabores.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="login-email"
            className="login-page__label"
          >
            Correo electrónico
          </label>

          <input
            id="login-email"
            className={`lys-input login-page__input ${
              errors.email ? 'err' : ''
            }`}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
          />

          {errors.email && (
            <p className="login-page__field-error">
              {errors.email}
            </p>
          )}

          <label
            htmlFor="login-password"
            className="login-page__label"
          >
            Contraseña
          </label>

          <input
            id="login-password"
            className={`lys-input login-page__input ${
              errors.password ? 'err' : ''
            }`}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {errors.password && (
            <p className="login-page__field-error">
              {errors.password}
            </p>
          )}

          <div className="login-page__forgot">
            <Link
              to="/forgot-password"
              className="login-page__link login-page__forgot-link"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {formError && (
            <p className="login-page__form-error" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="btn-ember login-page__submit"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-page__register">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" className="login-page__link">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;