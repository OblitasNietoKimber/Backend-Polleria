import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;
if (!baseUrl || !anonKey) {
  throw new Error('Configura VITE_INSFORGE_URL y VITE_INSFORGE_ANON_KEY en .env.local.');
}
if (anonKey.startsWith('ik_')) {
  throw new Error('El frontend requiere la clave anónima pública de InsForge.');
}
export const insforge = createClient({ baseUrl, anonKey });
