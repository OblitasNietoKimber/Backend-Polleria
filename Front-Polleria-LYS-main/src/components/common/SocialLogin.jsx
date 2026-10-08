import { useEffect, useState } from 'react';
import { getOAuthProviders, loginWithProvider } from '../../services/authService';
export default function SocialLogin() {
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    getOAuthProviders().then(items => { if (active) setProviders(items); })
      .catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  async function signIn(provider) {
    setLoading(true); setError('');
    try { await loginWithProvider(provider); }
    catch (error) { setError(error.message); setLoading(false); }
  }
  return <div>
    {['google', 'facebook'].filter(provider => providers.includes(provider)).map(provider =>
      <button className="login-page__submit" key={provider} type="button" disabled={loading} onClick={() => signIn(provider)}>
        Continuar con {provider === 'google' ? 'Google' : 'Facebook'}
      </button>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
