import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import * as authService from '../services/authService';
import {
  validatePersonalDataForm,
} from '../services/validators';
import '../styles/profile.css';

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  disabled,
}) {
  const id = `profile-${name}`;

  return (
    <div className="profile-field">
      <label htmlFor={id} className="profile-field-label">
        {label}
      </label>

      <input
        id={id}
        className={`lys-input profile-field-input ${error ? 'err' : ''}`}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {error && (
        <p id={`${id}-error`} className="profile-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/* Datos personales */
function DatosTab({ user }) {
  const [form, setForm] = useState({
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    telefono: user.telefono || '',
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
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

    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validatePersonalDataForm(form);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      await authService.updateProfile(form);
      setSaved(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-panel">
      <h2>Datos personales</h2>

      <p className="profile-panel-subtitle">
        Esta información se usa para tus pedidos y para identificarte en
        Leñas y Sabores.
      </p>

      {saved && (
        <div className="profile-success-banner" role="status">
          Tus datos se actualizaron correctamente.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="profile-form"
      >
        <div className="profile-form-row">
          <Field
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            autoComplete="given-name"
          />

          <Field
            label="Apellido"
            name="apellido"
            value={form.apellido}
            onChange={handleChange}
            error={errors.apellido}
            autoComplete="family-name"
          />
        </div>

        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          value={user.email || ''}
          autoComplete="email"
          disabled
        />

        <p className="profile-field-note">
          El correo no se puede editar por ahora.
        </p>

        <Field
          label="Teléfono"
          name="telefono"
          type="tel"
          value={form.telefono}
          onChange={handleChange}
          error={errors.telefono}
          autoComplete="tel"
        />

        {formError && (
          <p className="profile-form-error" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          className="btn-ember"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

/* Privacidad y seguridad */
function PrivacidadTab() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function requestChange() {
    setLoading(true);
    try {
      await authService.requestPasswordReset(user.email);
      setMessage('Revisa tu correo para cambiar la contraseña.');
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }
  return <div className="profile-panel">
    <h2>Privacidad y seguridad</h2>
    <p>Cambia tu contraseña mediante la verificación enviada a tu correo.</p>
    {message && <p role="status">{message}</p>}
    <button className="btn-ember" disabled={loading} onClick={requestChange}>
      {loading ? 'Enviando...' : 'Enviar correo para cambiar contraseña'}
    </button>
    <p><a href="/reset-password">Ingresar código recibido</a></p>
  </div>;
}

/* Preferencias */
function PreferenciasTab({ user }) {
  const [preferencias, setPreferencias] = useState(
    user.preferencias || {
      notificacionesEmail: true,
      notificacionesPromos: true,
    }
  );

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function toggle(key) {
    if (saving) return;
    const updated = {
      ...preferencias,
      [key]: !preferencias[key],
    };

    setSaving(true);
    setError('');
    try {
      const updatedUser = await authService.updatePreferences(updated);
      setPreferencias(updatedUser.preferencias);
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="profile-panel">
      <h2>Preferencias</h2>

      <p className="profile-panel-subtitle">
        Elige qué notificaciones quieres recibir de Leñas y Sabores.
      </p>

      {error && <p role="alert">{error}</p>}
      <div className="profile-preferences">
        <div className="profile-toggle-row">
          <div className="profile-toggle-label">
            <strong>Notificaciones por correo</strong>
            <span>Confirmaciones y estado de tus pedidos.</span>
          </div>

          <button
            type="button"
            className={`profile-switch${
              preferencias.notificacionesEmail ? ' on' : ''
            }`}
            disabled={saving}
            onClick={() => toggle('notificacionesEmail')}
            aria-pressed={preferencias.notificacionesEmail}
            aria-label="Notificaciones por correo"
          />
        </div>

        <div className="profile-toggle-row">
          <div className="profile-toggle-label">
            <strong>Ofertas y promociones</strong>
            <span>Novedades y descuentos de la pollería.</span>
          </div>

          <button
            type="button"
            className={`profile-switch${
              preferencias.notificacionesPromos ? ' on' : ''
            }`}
            disabled={saving}
            onClick={() => toggle('notificacionesPromos')}
            aria-pressed={preferencias.notificacionesPromos}
            aria-label="Ofertas y promociones"
          />
        </div>
      </div>
    </div>
  );
}

/* Página principal */
const TABS = [
  { id: 'datos', label: 'Datos personales' },
  { id: 'privacidad', label: 'Privacidad y seguridad' },
  { id: 'preferencias', label: 'Preferencias' },
];

function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('datos');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const initials = (
    (user.nombre?.[0] || '') + (user.apellido?.[0] || '')
  ).toUpperCase();

  return (
    <div className="profile-shell">
      <div className="profile-content">
        <nav className="profile-sidebar" aria-label="Mi cuenta">
          <div className="profile-sidebar-header">
            <div className="profile-avatar">
              {initials || 'LS'}
            </div>

            <div>
              <div className="profile-user-name">
                {user.nombre} {user.apellido}
              </div>

              <div className="profile-user-email">
                {user.email}
              </div>
            </div>
          </div>

          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profile-menu-item${
                tab === item.id ? ' active' : ''
              }`}
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === 'datos' && (
          <DatosTab user={user} />
        )}

        {tab === 'privacidad' && <PrivacidadTab />}

        {tab === 'preferencias' && (
          <PreferenciasTab user={user} />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;