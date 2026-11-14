/**
 * Prueba de aislamiento RLS con dos usuarios reales (A y B).
 * Escenario: A crea un documento y su archivo en Storage;
 * B NO debe poder leerlo, modificarlo, borrarlo ni escribir en su carpeta.
 *
 * Requiere: SUPABASE_URL y SUPABASE_ANON_KEY (env) y autoconfirm de correo activo.
 * Uso: node supabase/tests/rls.test.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

let createClient;
let ws;
try {
  ({ createClient } = await import('@supabase/supabase-js'));
  ws = (await import('ws')).default;
} catch {
  // Cuando corre desde supabase/tests sin node_modules propio, usa el del server.
  const require = createRequire(import.meta.url);
  ({ createClient } = require('../../server/node_modules/@supabase/supabase-js'));
  ws = require('../../server/node_modules/ws');
}

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY');
  process.exit(1);
}

const stamp = Date.now();
const pass = `clave-rls-${stamp}-abcd`;
const emailA = `rls-a-${stamp}@ejemplo.test`;
const emailB = `rls-b-${stamp}@ejemplo.test`;

const clientA = createClient(url, anonKey, { realtime: { transport: ws } });
const clientB = createClient(url, anonKey, { realtime: { transport: ws } });

let userIdA;
let userIdB;
let docId;
let archivoPathA;

try {
  // --- crear usuarios ---
  const { data: a, error: errA } = await clientA.auth.signUp({ email: emailA, password: pass });
  assert.ok(!errA, `signUp A: ${errA?.message}`);
  assert.ok(a.session, 'A no obtuvo sesión (¿autoconfirm desactivado?)');
  userIdA = a.user.id;

  const { data: b, error: errB } = await clientB.auth.signUp({ email: emailB, password: pass });
  assert.ok(!errB, `signUp B: ${errB?.message}`);
  assert.ok(b.session, 'B no obtuvo sesión (¿autoconfirm desactivado?)');
  userIdB = b.user.id;

  // --- A inserta un documento ---
  const { data: doc, error: insErr } = await clientA
    .from('documents')
    .insert({ user_id: userIdA, nombre: 'apuntes-a.pdf', archivo_path: `${userIdA}/apuntes-a.pdf` })
    .select('id')
    .single();
  assert.ok(!insErr, `insert A: ${JSON.stringify(insErr)}`);
  docId = doc.id;

  // --- A sube su archivo a Storage ---
  archivoPathA = `${userIdA}/apuntes-a.pdf`;
  const { error: upErr } = await clientA.storage
    .from('archivos')
    .upload(archivoPathA, new Blob(['material de A'], { type: 'text/plain' }), { upsert: true });
  assert.ok(!upErr, `upload A: ${upErr?.message}`);

  // --- B NO ve el documento ---
  const { data: visto, error: e1 } = await clientB.from('documents').select('*').eq('id', docId);
  assert.ok(!e1, `select B: ${JSON.stringify(e1)}`);
  assert.equal(visto.length, 0, 'B pudo LEER el documento de A (RLS roto)');

  // --- B NO ve la lista de A ---
  const { data: listaB, error: e2 } = await clientB.from('documents').select('*');
  assert.ok(!e2, `list B: ${JSON.stringify(e2)}`);
  assert.ok(!listaB.some((d) => d.id === docId), 'B vio el documento de A en la lista');

  // --- B NO puede modificarlo (RLS: error o 0 filas) ---
  const { data: upd, error: e3 } = await clientB
    .from('documents')
    .update({ nombre: 'hackeado' })
    .eq('id', docId)
    .select();
  assert.ok(e3 || upd.length === 0, 'B pudo ACTUALIZAR el documento de A');

  // --- B NO puede borrarlo ---
  const { data: del, error: e4 } = await clientB.from('documents').delete().eq('id', docId).select();
  assert.ok(e4 || del.length === 0, 'B pudo BORRAR el documento de A');

  // --- B NO puede insertar un chunk del documento de A ---
  const { data: chunk, error: e5 } = await clientB
    .from('chunks')
    .insert({ document_id: docId, contenido: 'intrusión', embedding: Array(1024).fill(0) })
    .select();
  assert.ok(e5 || chunk.length === 0, 'B pudo INSERTAR un chunk en el documento de A');

  // --- B NO puede descargar el archivo de A ni escribir en su carpeta ---
  const { error: dlErr } = await clientB.storage.from('archivos').download(archivoPathA);
  assert.ok(dlErr, 'B pudo DESCARGAR el archivo de A');

  const { error: upBErr } = await clientB.storage
    .from('archivos')
    .upload(`${userIdA}/intruso.txt`, new Blob(['intruso'], { type: 'text/plain' }), { upsert: true });
  assert.ok(upBErr, 'B pudo ESCRIBIR en la carpeta de A');

  // --- B SÍ puede trabajar con lo suyo (control positivo) ---
  const { data: propio, error: e6 } = await clientB
    .from('documents')
    .insert({ user_id: userIdB, nombre: 'b.pdf', archivo_path: `${userIdB}/b.pdf` })
    .select('id')
    .single();
  assert.ok(!e6, `insert positivo B: ${JSON.stringify(e6)}`);

  console.log('RLS OK: B no lee, ni escribe, ni borra datos ni archivos de A.');
  console.log('Documentos probados: documents, chunks y storage.objects.');

  // --- limpieza ---
  await clientA.from('documents').delete().eq('id', docId);
  await clientA.storage.from('archivos').remove([archivoPathA]);
  await clientB.from('documents').delete().eq('id', propio.id);
  console.log('Limpieza completada.');
  process.exit(0);
} catch (e) {
  console.error('FALLO RLS:', e.message);
  try {
    if (docId) await clientA.from('documents').delete().eq('id', docId);
    if (archivoPathA) await clientA.storage.from('archivos').remove([archivoPathA]);
  } catch {
    /* noop */
  }
  process.exit(1);
}
