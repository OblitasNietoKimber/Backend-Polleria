import { insforge, configurationError } from '../lib/insforge';

let snapshot = { user: null, loading: true, error: '' };
let initialized;
let generation = 0;
const listeners = new Set();
const normalizeEmail = (email) => email.trim().toLowerCase();
const pendingKey = 'lys_pending_profile';
function publish(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}
export const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getSnapshot = () => snapshot;
export const getCurrentUser = () => snapshot.user;
export const isAuthenticated = () => Boolean(snapshot.user);
function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'No se pudo conectar con InsForge.');
  return data;
}
function pendingProfile(email) {
  try {
    const pending = JSON.parse(sessionStorage.getItem(pendingKey));
    return pending?.email === email ? pending : null;
  } catch { return null; }
}
async function loadProfile(user) {
  let profile = unwrap(await insforge.database.from('perfiles').select('*').eq('id', user.id).maybeSingle());
  const pending = pendingProfile(user.email);
  if (!profile) {
    const fields = pending || { nombre: user.profile?.name || '', apellido: '', telefono: '' };
    const result = await insforge.database.from('perfiles').insert([{
      id: user.id, nombre: fields.nombre, apellido: fields.apellido, telefono: fields.telefono,
    }]).select().single();
    if (result.error?.code === '23505') {
      profile = unwrap(await insforge.database.from('perfiles').select('*').eq('id', user.id).single());
    } else profile = unwrap(result);
  }
  if (pending) {
    profile = unwrap(await insforge.database.from('perfiles').update({
      nombre: pending.nombre, apellido: pending.apellido, telefono: pending.telefono,
    }).eq('id', user.id).select().single());
    sessionStorage.removeItem(pendingKey);
  }
  return { ...profile, email: user.email, creadoEn: profile.creado_en };
}
export async function restoreSession() {
  const current = ++generation;
  try {
    if (configurationError) throw new Error(configurationError);
    const result = await insforge.auth.getCurrentUser();
    // Un navegador sin cookie de sesión recibe 401; debe poder abrir el login.
    const data = result.error?.statusCode === 401 ? { user: null } : unwrap(result);
    const user = data?.user ? await loadProfile(data.user) : null;
    if (generation === current) publish({ user, loading: false, error: '' });
    return user;
  } catch (error) {
    if (generation === current) publish({ user: null, loading: false, error: error.message });
    throw error;
  }
}
export function initializeAuth() {
  if (!initialized) {
    if (configurationError) {
      publish({ user: null, loading: false, error: configurationError });
      initialized = Promise.resolve(null);
      return initialized;
    }
    // Retira credenciales y sesiones del prototipo; nunca se importan como cuentas reales.
    try {
      ['lys_users', 'lys_session', 'lys_reset_requests'].forEach((key) => localStorage.removeItem(key));
    } catch {
      // Un navegador que bloquea localStorage aún debe poder mostrar el login.
    }
    insforge.auth.onAuthStateChange((event) => {
      if (event === 'signedOut') { generation++; publish({ user: null, loading: false }); }
      else if (event === 'tokenRefreshed') { void restoreSession().catch(() => {}); }
    });
    initialized = restoreSession().catch(() => null);
  }
  return initialized;
}
export async function register(data) {
  const email = normalizeEmail(data.email);
  const pending = { email, nombre: data.nombre.trim(), apellido: data.apellido.trim(), telefono: data.telefono.trim() };
  const result = unwrap(await insforge.auth.signUp({
    email, password: data.password, name: `${pending.nombre} ${pending.apellido}`,
    redirectTo: `${window.location.origin}/login`,
  }));
  sessionStorage.setItem(pendingKey, JSON.stringify(pending));
  if (result.requireEmailVerification) return { requireEmailVerification: true, email };
  return { user: await restoreSession(), requireEmailVerification: false };
}
export async function login({ email, password }) {
  unwrap(await insforge.auth.signInWithPassword({ email: normalizeEmail(email), password }));
  return restoreSession();
}
export async function logout() {
  // La UI pierde acceso inmediatamente incluso si falla la conexión al cerrar sesión.
  generation++;
  publish({ user: null, loading: false, error: '' });
  unwrap(await insforge.auth.signOut());
}
export async function updateProfile(data) {
  const user = getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión.');
  const profile = unwrap(await insforge.database.from('perfiles').update({
    nombre: data.nombre.trim(), apellido: data.apellido.trim(), telefono: data.telefono.trim(),
  }).eq('id', user.id).select().single());
  const updated = { ...user, ...profile };
  publish({ user: updated });
  return updated;
}
export async function updatePreferences(preferencias) {
  const user = getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión.');
  const profile = unwrap(await insforge.database.from('perfiles').update({
    preferencias: {
      notificacionesEmail: Boolean(preferencias.notificacionesEmail),
      notificacionesPromos: Boolean(preferencias.notificacionesPromos),
    },
  }).eq('id', user.id).select().single());
  const updated = { ...user, ...profile };
  publish({ user: updated });
  return updated;
}
export async function requestPasswordReset(email) {
  unwrap(await insforge.auth.sendResetPasswordEmail({
    email: normalizeEmail(email), redirectTo: `${window.location.origin}/reset-password`,
  }));
}
export async function resetPassword({ email, code, token, password }) {
  const otp = token || unwrap(await insforge.auth.exchangeResetPasswordToken({ email: normalizeEmail(email), code: code.trim() })).token;
  unwrap(await insforge.auth.resetPassword({ newPassword: password, otp }));
}
export async function verifyEmail({ email, code }) {
  unwrap(await insforge.auth.verifyEmail({ email: normalizeEmail(email), otp: code.trim() }));
  return restoreSession();
}
export async function resendVerification(email) {
  unwrap(await insforge.auth.resendVerificationEmail({ email: normalizeEmail(email), redirectTo: `${window.location.origin}/login` }));
}
export async function getOAuthProviders() {
  return unwrap(await insforge.auth.getPublicAuthConfig()).oAuthProviders || [];
}
export async function loginWithProvider(provider) {
  const providers = await getOAuthProviders();
  if (!providers.includes(provider)) throw new Error('Este proveedor no está habilitado en InsForge.');
  unwrap(await insforge.auth.signInWithOAuth(provider, { redirectTo: `${window.location.origin}/auth/callback` }));
}
export default { register, login, logout, getCurrentUser, isAuthenticated, updateProfile, updatePreferences, requestPasswordReset, resetPassword };
