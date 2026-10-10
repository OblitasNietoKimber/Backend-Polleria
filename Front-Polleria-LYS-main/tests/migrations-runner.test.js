import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const argv=process.argv;
const queries=[];
let existing=null;
beforeEach(()=>{
 vi.resetModules();queries.length=0;existing=null;
 process.argv=['node','migrate.mjs','--application','--from','20261010010000'];
 vi.stubEnv('INSFORGE_URL','https://project.example.test');vi.stubEnv('INSFORGE_API_KEY','test-admin-key');
 vi.spyOn(console,'log').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{
  const {query}=JSON.parse(options.body);queries.push(query);
  const match=query.match(/WHERE nombre='([^']+)'/);
  return {ok:true,json:async()=>({rows:query.startsWith('SELECT sha256') && existing ? [{sha256:await existing(match[1])}] : []})};
 }));
});
afterEach(()=>{process.argv=argv;vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
test('aplica solo las migraciones nuevas y registra la huella dentro del bloque atómico',async()=>{
 await import('../../insforge/migrate.mjs');
 const writes=queries.filter(q=>q.startsWith('DO $migration$'));
 expect(writes).toHaveLength(2);expect(writes[0]).toContain('cambiar_estado_cocina');expect(writes[1]).toContain('lys_personal_suscribir');
 expect(writes.every(q=>q.includes('pg_advisory_xact_lock') && q.includes('INSERT INTO lys_private.migraciones'))).toBe(true);
 expect(queries.join('\n')).not.toContain('20261009010000_pedido-meseras.sql');
});
test('una migración registrada se omite cuando su contenido no cambia',async()=>{
 existing=async name=>createHash('sha256').update(await readFile(new URL(`../../migrations/${name}`,import.meta.url))).digest('hex');
 await import('../../insforge/migrate.mjs');expect(queries.some(q=>q.startsWith('DO $migration$'))).toBe(false);
});
test('rechaza modificar una migración que ya se aplicó',async()=>{
 existing=async()=>'huella-distinta';await expect(import('../../insforge/migrate.mjs')).rejects.toThrow(/cambió después de aplicarse/);
});
test('una opción from incompleta no consulta ni modifica el backend',async()=>{
 process.argv=['node','migrate.mjs','--from'];await expect(import('../../insforge/migrate.mjs')).rejects.toThrow(/después de --from/);expect(queries).toEqual([]);
});
