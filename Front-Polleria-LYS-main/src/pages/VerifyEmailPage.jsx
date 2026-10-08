import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../services/authService';
export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setLoading(true); setMessage('');
    try { await verifyEmail({ email, code }); navigate('/profile', { replace: true }); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }
  async function resend() {
    setLoading(true);
    try { await resendVerification(email); setMessage('Revisa tu correo: enviamos la verificación.'); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }
  return <div className="login-page"><div className="login-page__card">
    <h1>Verifica tu correo</h1>
    <p>Ingresa el código enviado por InsForge o abre el enlace recibido en tu correo.</p>
    <form onSubmit={submit}>
      <label htmlFor="verify-email">Correo electrónico</label>
      <input className="lys-input" id="verify-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="verify-code">Código de verificación</label>
      <input className="lys-input" id="verify-code" required pattern="[0-9]{6}" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} />
      <button className="btn-ember" disabled={loading}>Verificar correo</button>
    </form>
    <button disabled={loading || !email} onClick={resend}>Reenviar verificación</button>
    {message && <p role="status">{message}</p>}
    <Link to="/login">Volver al inicio de sesión</Link>
  </div></div>;
}
