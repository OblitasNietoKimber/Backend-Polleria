import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.trim();
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY?.trim();
let client = null;
let error = '';

// La configuración inválida debe poder mostrarse en React sin detener sus imports.
if (!baseUrl || !anonKey) {
  error = 'Falta configurar VITE_INSFORGE_URL o VITE_INSFORGE_ANON_KEY en .env.local.';
} else if (anonKey.startsWith('ik_')) {
  error = 'El frontend requiere la clave anónima pública de InsForge.';
} else {
  try {
    if (!['https:', 'http:'].includes(new URL(baseUrl).protocol)) {
      throw new Error('La URL de InsForge debe comenzar con https:// o http://.');
    }
    client = createClient({ baseUrl, anonKey });
  } catch {
    error = 'Revisa la URL y la clave pública de InsForge en .env.local.';
  }
}

export const insforge = client;
export const configurationError = error;
