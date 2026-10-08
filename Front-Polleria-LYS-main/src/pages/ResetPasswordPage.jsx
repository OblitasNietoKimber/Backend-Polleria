import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as authService from '../services/authService';
import { validateResetPasswordForm } from '../services/validators';
import Logo from '../components/common/Logo';
import '../styles/login.css';

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}) {
  const id = `reset-${name}`;

  return (
    <div>
      <label htmlFor={id} className="login-page__label">
        {label}
      </label>

      <input
        id={id}
        className={`lys-input login-page__input ${error ? 'err' : ''}`}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {error && (
        <p id={`${id}-error`} className="login-page__field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: location.state?.email || '',
    code: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigate('/login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [success, navigate]);

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

    if (loading || success) return;

    setFormError('');

    const fieldErrors = validateResetPasswordForm(form);

    if (!form.email.trim()) {
      fieldErrors.email = 'Ingresa tu correo electrónico.';
    }

    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      await authService.resetPassword(form);
      setSuccess(true);
    } catch (err) {
      setFormError(
        err.message || 'No se pudo restablecer la contraseña.'
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
          Restablecer contraseña
        </h1>

        <p className="login-page__subtitle">
          Ingresa el código que te enviamos y tu nueva contraseña.
        </p>

        {success ? (
          <div className="login-page__success" role="status">
            <p>
              Tu contraseña se actualizó correctamente.
              Te redirigimos al inicio de sesión...
            </p>

            <Link to="/login" className="login-page__link">
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
            />

            <Field
              label="Código de verificación"
              name="code"
              value={form.code}
              onChange={handleChange}
              error={errors.code}
              placeholder="123456"
              autoComplete="one-time-code"
            />

            <Field
              label="Nueva contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Field
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
              autoComplete="new-password"
            />

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
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>

            <p className="login-page__register">
              <Link
                to="/forgot-password"
                className="login-page__link"
              >
                Reenviar código
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;