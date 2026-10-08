import { beforeEach, expect, test, vi } from 'vitest';
const fake = vi.hoisted(() => ({ auth: {}, database: { from: vi.fn() } }));
vi.mock('../src/lib/insforge', () => ({ insforge: fake }));
let service;
let profile;
let writes;
const user = { id: 'user-1', email: 'cliente@example.test', profile: { name: 'Cliente' } };
beforeEach(async () => {
  vi.resetModules(); writes = [];
  profile = { id: user.id, rol: 'cliente', nombre: 'Cliente', apellido: '', telefono: '', preferencias: {} };
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
  const values = new Map();
  vi.stubGlobal('localStorage', { removeItem: vi.fn() });
  vi.stubGlobal('sessionStorage', { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) });
  fake.auth = {
    onAuthStateChange: vi.fn(), getCurrentUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { requireEmailVerification: true }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getPublicAuthConfig: vi.fn().mockResolvedValue({ data: { oAuthProviders: ['google'] }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    sendResetPasswordEmail: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    exchangeResetPasswordToken: vi.fn().mockResolvedValue({ data: { token: 'email-token' }, error: null }),
    resetPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
  fake.database.from.mockImplementation(() => {
    const q = {
      select: () => q, eq: () => q,
      maybeSingle: async () => ({ data: profile, error: null }),
      single: async () => ({ data: profile, error: null }),
      update: patch => { writes.push(patch); profile = { ...profile, ...patch }; return q; },
      insert: rows => { writes.push(rows); profile = { ...profile, ...rows[0] }; return q; },
    }; return q;
  });
  service = await import('../src/services/authService');
});
test('permite abrir el login sin una cookie de sesión', async () => {
  fake.auth.getCurrentUser.mockResolvedValue({ data: { user: null }, error: { statusCode: 401 } });
  await service.initializeAuth();
  expect(service.getSnapshot()).toMatchObject({ user: null, loading: false, error: '' });
});
test('restaura el perfil del servidor y elimina las cuentas simuladas', async () => {
  await service.initializeAuth();
  expect(service.getCurrentUser().rol).toBe('cliente');
  expect(localStorage.removeItem).toHaveBeenCalledWith('lys_users');
});
test('registra sin guardar contraseña ni aceptar roles del formulario', async () => {
  await service.register({ nombre: ' Ana ', apellido: ' Torres ', telefono: '987654321', email: ' ANA@example.test ', password: 'Secret123', rol: 'admin' });
  expect(fake.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.test' }));
  expect(sessionStorage.getItem('lys_pending_profile')).not.toContain('Secret123');
  expect(sessionStorage.getItem('lys_pending_profile')).not.toContain('admin');
});
test('ignora intentos de modificar el rol al editar el perfil', async () => {
  await service.restoreSession();
  await service.updateProfile({ nombre: 'Ana', apellido: 'Torres', telefono: '987654321', rol: 'admin' });
  expect(writes).toEqual([{ nombre: 'Ana', apellido: 'Torres', telefono: '987654321' }]);
});
test('canjea el código enviado por correo antes de cambiar la contraseña', async () => {
  await service.resetPassword({ email: 'ANA@example.test', code: '123456', password: 'NewSecret123' });
  expect(fake.auth.exchangeResetPasswordToken).toHaveBeenCalledWith({ email: 'ana@example.test', code: '123456' });
  expect(fake.auth.resetPassword).toHaveBeenCalledWith({ newPassword: 'NewSecret123', otp: 'email-token' });
});
test('no devuelve el código de recuperación a la interfaz', async () => {
  expect(await service.requestPasswordReset('ana@example.test')).toBeUndefined();
});
test('un código inválido impide cambiar la contraseña', async () => {
  fake.auth.exchangeResetPasswordToken.mockResolvedValue({ data: null, error: { message: 'Código inválido' } });
  await expect(service.resetPassword({ email: 'ana@example.test', code: '000000', password: 'NewSecret123' })).rejects.toThrow('Código inválido');
  expect(fake.auth.resetPassword).not.toHaveBeenCalled();
});
test('acepta el token del enlace sin canjear un código', async () => {
  await service.resetPassword({ token: 'link-token', password: 'NewSecret123' });
  expect(fake.auth.exchangeResetPasswordToken).not.toHaveBeenCalled();
  expect(fake.auth.resetPassword).toHaveBeenCalledWith({ newPassword: 'NewSecret123', otp: 'link-token' });
});
test('rechaza Facebook si no está habilitado y conecta Google', async () => {
  await expect(service.loginWithProvider('facebook')).rejects.toThrow('no está habilitado');
  await service.loginWithProvider('google');
  expect(fake.auth.signInWithOAuth).toHaveBeenCalledWith('google', { redirectTo: 'http://localhost:5173/auth/callback' });
});
test('un fallo de red no conserva acceso local al cerrar sesión', async () => {
  await service.restoreSession();
  fake.auth.signOut.mockResolvedValue({ error: { message: 'Sin conexión' } });
  await expect(service.logout()).rejects.toThrow('Sin conexión');
  expect(service.getCurrentUser()).toBeNull();
});
