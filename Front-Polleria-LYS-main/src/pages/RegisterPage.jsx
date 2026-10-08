import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authService from '../services/authService';
import { validateRegisterForm } from '../services/validators';
import Logo from '../components/common/Logo';
import '../styles/login.css';

const initialForm = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  password: '',
  confirmPassword: '',
};

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
  const id = `register-${name}`;

  return (
    <div className="register-page__field">
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

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
  const { name, value } = e.target;

  let newValue = value;

  if (name === 'telefono') {
    // Elimina letras, espacios y símbolos
    newValue = value.replace(/\D/g, '');

    // Máximo 9 números
    newValue = newValue.slice(0, 9);

    // Si escribe algo, debe comenzar con 9
    if (newValue.length > 0 && !newValue.startsWith('9')) {
      return;
    }
  }

  setForm((prev) => ({
    ...prev,
    [name]: newValue,
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

    const fieldErrors = validateRegisterForm(form);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      await authService.register(form);

      await authService.login({
        email: form.email,
        password: form.password,
      });

      navigate('/profile');
    } catch (err) {
      setFormError(
        err.message || 'No se pudo completar el registro.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lys-root login-page register-page">
      <div className="login-page__card">
        <div className="login-page__logo">
          <Logo size="md" />
        </div>

        <h1 className="font-display login-page__title">
          Crea tu cuenta
        </h1>

        <p className="login-page__subtitle">
          Regístrate para hacer pedidos y guardar tus datos en Leñas y Sabores.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="register-page__row">
            <Field
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              error={errors.nombre}
              placeholder="Juan"
              autoComplete="given-name"
            />

            <Field
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              error={errors.apellido}
              placeholder="Pérez"
              autoComplete="family-name"
            />
          </div>

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
            label="Teléfono"
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
            error={errors.telefono}
            placeholder="987654321"
            autoComplete="tel"
            inputMode="numeric"
            maxLength={9}
          />

          <Field
            label="Contraseña"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <Field
            label="Confirmar contraseña"
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="login-page__register">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="login-page__link">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;