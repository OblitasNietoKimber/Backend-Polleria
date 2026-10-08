const baseUrl = process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
if (!baseUrl || !apiKey) throw new Error('Define INSFORGE_URL e INSFORGE_API_KEY en el entorno del administrador.');
const endpoint = `${baseUrl.replace(/\/$/,'')}/api/auth/config`;
const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
const response = await fetch(endpoint, { headers });
if (!response.ok) throw new Error(`No se pudo leer Auth: HTTP ${response.status}`);
const config = await response.json();
const allowedRedirectUrls = [...new Set([
  ...(config.allowedRedirectUrls || []),
  ...['/login','/reset-password','/auth/callback'].map(path => new URL(path, frontend).href),
])];
const update = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify({ allowedRedirectUrls }) });
if (!update.ok) throw new Error(`No se pudo configurar Auth: HTTP ${update.status}`);
console.log('Retornos de autenticación configurados para', new URL(frontend).origin);
