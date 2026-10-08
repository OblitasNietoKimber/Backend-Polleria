/**
 * validators.js
 *
 * Funciones de validación reutilizables para los formularios de
 * autenticación (login, registro, recuperar/cambiar contraseña) y perfil.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^9\d{8}$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test((email || '').trim());
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test((phone || '').trim());
}

export function getPasswordError(password) {
  if (!password) return 'Ingresa una contraseña.';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

export function validateLoginForm(form) {
  const errors = {};

  if (!form.email) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (!form.password) {
    errors.password = 'Ingresa tu contraseña.';
  }

  return errors;
}

export function validateRegisterForm(form) {
  const errors = {};

  if (!form.nombre || form.nombre.trim().length < 2) {
    errors.nombre = 'Ingresa tu nombre (mínimo 2 caracteres).';
  }
  if (!form.apellido || form.apellido.trim().length < 2) {
    errors.apellido = 'Ingresa tu apellido (mínimo 2 caracteres).';
  }
  if (!form.email) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }
  if (!form.telefono) {
  errors.telefono = 'Ingresa tu número de teléfono.';
} else if (!isValidPhone(form.telefono)) {
  errors.telefono = 'El celular debe comenzar con 9 y tener 9 dígitos.';
}

  const passwordError = getPasswordError(form.password);
  if (passwordError) errors.password = passwordError;

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export function validateForgotPasswordForm(form) {
  const errors = {};
  if (!form.email) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }
  return errors;
}

export function validateResetPasswordForm(form) {
  const errors = {};

  if (!form.code) {
    errors.code = 'Ingresa el código de verificación.';
  }

  const passwordError = getPasswordError(form.password);
  if (passwordError) errors.password = passwordError;

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export function validateChangePasswordForm(form) {
  const errors = {};

  if (!form.currentPassword) {
    errors.currentPassword = 'Ingresa tu contraseña actual.';
  }

  const passwordError = getPasswordError(form.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
    errors.newPassword = 'La nueva contraseña debe ser diferente a la actual.';
  }

  return errors;
}

export function validatePersonalDataForm(form) {
  const errors = {};

  if (!form.nombre || form.nombre.trim().length < 2) {
    errors.nombre = 'Ingresa un nombre válido.';
  }
  if (!form.apellido || form.apellido.trim().length < 2) {
    errors.apellido = 'Ingresa un apellido válido.';
  }
  if (!form.telefono) {
    errors.telefono = 'Ingresa tu número de teléfono.';
  } else if (!isValidPhone(form.telefono)) {
    errors.telefono = 'Ingresa un número de celular válido (9 dígitos).';
  }

  return errors;
}