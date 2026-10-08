/**
 * authService.js
 *
 * Servicio de autenticación. Por ahora simula un backend usando localStorage,
 * para poder maquetar y validar todo el flujo de Login/Registro/Perfil sin
 * depender de que el API REST ya esté disponible.
 *
 * Cuando exista el backend real, solo hay que reemplazar el cuerpo de estas
 * funciones por llamadas fetch/axios; la firma (parámetros y lo que retornan)
 * se mantiene igual para no romper los componentes que ya las consumen.
 */

const USERS_KEY = 'lys_users';
const SESSION_KEY = 'lys_session';
const RESET_KEY = 'lys_reset_requests';


function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}


export function register(data) {
  const email = normalizeEmail(data.email);
  const users = getUsers();

  if (users.some((u) => u.email === email)) {
    throw new Error('Ya existe una cuenta registrada con ese correo.');
  }

  const newUser = {
    id: Date.now().toString(36),
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    email,
    telefono: data.telefono.trim(),
    password: data.password, 
    rol: 'cliente',
    preferencias: {
      notificacionesEmail: true,
      notificacionesPromos: true,
    },
    creadoEn: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return sanitizeUser(newUser);
}

export function login({ email, password }) {
  const users = getUsers();
  const user = users.find((u) => u.email === normalizeEmail(email));

  if (!user || user.password !== password) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  const session = sanitizeUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// --- Recuperación de contraseña ----------------------------------------

function getResetRequests() {
  const raw = localStorage.getItem(RESET_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveResetRequests(requests) {
  localStorage.setItem(RESET_KEY, JSON.stringify(requests));
}

export function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const users = getUsers();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    throw new Error('No encontramos una cuenta con ese correo.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const requests = getResetRequests();
  requests[normalizedEmail] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
  };
  saveResetRequests(requests);

  return { email: normalizedEmail, code };
}

export function resetPassword({ email, code, password }) {
  const normalizedEmail = normalizeEmail(email);
  const requests = getResetRequests();
  const request = requests[normalizedEmail];

  if (!request || request.code !== code) {
    throw new Error('El código de verificación es inválido.');
  }
  if (Date.now() > request.expiresAt) {
    throw new Error('El código de verificación expiró. Solicita uno nuevo.');
  }

  const users = getUsers();
  const userIndex = users.findIndex((u) => u.email === normalizedEmail);
  if (userIndex === -1) {
    throw new Error('No encontramos una cuenta con ese correo.');
  }

  users[userIndex].password = password;
  saveUsers(users);

  delete requests[normalizedEmail];
  saveResetRequests(requests);
}

export function changePassword({ currentPassword, newPassword }) {
  const session = getCurrentUser();
  if (!session) throw new Error('Debes iniciar sesión para cambiar tu contraseña.');

  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === session.id);
  if (userIndex === -1) throw new Error('No encontramos tu cuenta.');

  if (users[userIndex].password !== currentPassword) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  users[userIndex].password = newPassword;
  saveUsers(users);
}

export function updateProfile(data) {
  const session = getCurrentUser();
  if (!session) throw new Error('Debes iniciar sesión para editar tu perfil.');

  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === session.id);
  if (userIndex === -1) throw new Error('No encontramos tu cuenta.');

  users[userIndex] = {
    ...users[userIndex],
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    telefono: data.telefono.trim(),
  };
  saveUsers(users);

  const updatedSession = sanitizeUser(users[userIndex]);
  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
}

export function updatePreferences(preferencias) {
  const session = getCurrentUser();
  if (!session) throw new Error('Debes iniciar sesión.');

  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === session.id);
  if (userIndex === -1) throw new Error('No encontramos tu cuenta.');

  users[userIndex].preferencias = { ...users[userIndex].preferencias, ...preferencias };
  saveUsers(users);

  const updatedSession = sanitizeUser(users[userIndex]);
  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
}

// --- Cuentas de prueba ---------------------------------------------------

export function seedTestAccounts() {
  const users = getUsers();

  const demoUsers = [
    {
           id: 'demo-cliente-1',
      nombre: 'Cliente',
      apellido: 'Demo',
      email: 'cliente@lenasysabores.test',
      telefono: '987654321',
      password: 'Cliente123',
      rol: 'cliente',
      preferencias: { notificacionesEmail: true, notificacionesPromos: true,},
      creadoEn: new Date().toISOString(),
    },
    {
      id: 'demo-admin-1',
      nombre: 'Ana',
      apellido: 'Torres',
      email: 'admin@lenasysabores.test',
      telefono: '987654322',
      password: 'Admin123',
      rol: 'admin',
      preferencias: { notificacionesEmail: true, notificacionesPromos: false },
      creadoEn: new Date().toISOString(),
    },
    {
      id: 'demo-mesera-1',
      nombre: 'Fernando',
      apellido: 'Celis',
      email: 'mesera@lenasysabores.test',
      telefono: '987654323',
      password: 'Mesera123',
      rol: 'mesera',
      preferencias: {notificacionesEmail: true,notificacionesPromos: false,},
      creadoEn: new Date().toISOString(),
    },
    {
      id: 'demo-cocina-1',
      nombre: 'Carlos',
      apellido: 'Ramírez',
      email: 'cocina@lenasysabores.test',
      telefono: '987654324',
      password: 'Cocina123',
      rol: 'cocina',
      preferencias: { notificacionesEmail: true,notificacionesPromos: false,
      },
      creadoEn: new Date().toISOString(),
    },
  ];

  demoUsers.forEach((demoUser) => {
    const accountExists = users.some(
      (user) => user.email === demoUser.email
    );

    if (!accountExists) {
      users.push(demoUser);
    }
  });

  saveUsers(users);
}

export default {
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateProfile,
  updatePreferences,
  seedTestAccounts,
};