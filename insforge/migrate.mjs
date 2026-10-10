import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2);
const application = args.includes('--application');
const fromIndex = args.indexOf('--from');
const from = fromIndex >= 0 ? args[fromIndex + 1] : '';
if (fromIndex >= 0 && (!from || !/^\d{14}(?:[a-zA-Z0-9_.-]*)$/.test(from))) throw new Error('Indica el nombre o prefijo de migración después de --from.');
const allowed = new Set(['--application','--from',from]);
if (args.some(arg => !allowed.has(arg))) throw new Error('Opciones: --application --from <nombre o prefijo>.');
const url = process.env.INSFORGE_URL;
const key = process.env.INSFORGE_API_KEY;
if (!url || !key) throw new Error('Define INSFORGE_URL e INSFORGE_API_KEY solo en el entorno del administrador.');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
async function sql(query) {
  const response = await fetch(`${url.replace(/\/$/,'')}/api/database/advance/rawsql`, {
    method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params: [] }), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.message || result.error || `HTTP ${response.status}`);
  return result;
}
await sql(`CREATE SCHEMA IF NOT EXISTS lys_private;
  REVOKE ALL ON SCHEMA lys_private FROM PUBLIC,anon,authenticated;
  CREATE TABLE IF NOT EXISTS lys_private.migraciones(nombre text PRIMARY KEY, sha256 text NOT NULL, aplicado_en timestamptz NOT NULL DEFAULT now());`);
const directory = new URL(application ? '../migrations/' : './migrations/', import.meta.url);
for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql') && (!from || name >= from)).sort()) {
  const source = await readFile(new URL(name, directory), 'utf8');
  const digest = createHash('sha256').update(source).digest('hex');
  const existing = (await sql(`SELECT sha256 FROM lys_private.migraciones WHERE nombre=${quote(name)}`)).rows?.[0];
  if (existing) {
    if (existing.sha256 !== digest) throw new Error(`La migración ${name} cambió después de aplicarse. Crea una nueva migración.`);
    console.log(`Ya aplicada: ${name}`); continue;
  }
  const body = source.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
  await sql(`DO $migration$ BEGIN
    PERFORM pg_advisory_xact_lock(687241);
    IF EXISTS (SELECT 1 FROM lys_private.migraciones WHERE nombre=${quote(name)}) THEN
      IF NOT EXISTS (SELECT 1 FROM lys_private.migraciones WHERE nombre=${quote(name)} AND sha256=${quote(digest)}) THEN
        RAISE EXCEPTION 'La migración cambió después de aplicarse';
      END IF;
      RETURN;
    END IF;
    EXECUTE $ddl$ ${body} $ddl$;
    INSERT INTO lys_private.migraciones(nombre,sha256) VALUES (${quote(name)},${quote(digest)});
    END $migration$;`);
  console.log(`Aplicada: ${name}`);
}
