import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authService from '../services/authService';
import { validateForgotPasswordForm } from '../services/validators';
import Logo from '../components/common/Logo';
import '../styles/login.css';

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState(null);
  const [sentEmail, setSentEmail] = useState(null);

  useEffect(() => {
    if (sentEmail === null) return;

    const timer = setTimeout(() => {
      navigate('/reset-password', {
        state: { email: sentEmail },
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [sentEmail, navigate]);

  function handleChange(e) {
    setEmail(e.target.value);

    if (errors.email) {
      setErrors((prev) => ({
        ...prev,
        email: null,
      }));
    }

    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading || sentEmail !== null) return;

    setFormError('');

    const fieldErrors = validateForgotPasswordForm({ email });
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      const { code } = await authService.requestPasswordReset(email);

      setDevCode(code);
      setSentEmail(email);
    } catch (err) {
      setFormError(
        err.message || 'No se pudo solicitar el código de recuperación.'
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
          Recupera tu contraseña
        </h1>

        <p className="login-page__subtitle">
          Ingresa tu correo y te enviaremos un código de verificación.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="forgot-email"
            className="login-page__label"
          >
            Correo electrónico
          </label>

          <input
            id="forgot-email"
            className={`lys-input login-page__input ${
              errors.email ? 'err' : ''
            }`}
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            disabled={loading || sentEmail !== null}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? 'forgot-email-error' : undefined
            }
          />

          {errors.email && (
            <p
              id="forgot-email-error"
              className="login-page__field-error"
            >
              {errors.email}
            </p>
          )}

          {formError && (
            <p className="login-page__form-error" role="alert">
              {formError}
            </p>
          )}

          {sentEmail !== null && (
            <p
              className="login-page__demo-code"
              role="status"
            >
              {devCode != null && (
                <>
                  Código de verificación (demo):{' '}
                  <strong className="font-mono">{devCode}</strong>.
                  {' '}
                </>
              )}
              Te redirigimos para ingresar el código...
            </p>
          )}

          <button
            type="submit"
            className="btn-ember login-page__submit"
            disabled={loading || sentEmail !== null}
          >
            {loading
              ? 'Enviando...'
              : sentEmail !== null
                ? 'Continuando...'
                : 'Enviar código de recuperación'}
          </button>
        </form>

        <p className="login-page__register">
          <Link to="/login" className="login-page__link">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;