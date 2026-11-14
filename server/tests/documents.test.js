import request from 'supertest';
import { createApp } from '../src/app.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const user = { id: USER_ID, email: 'a@test.com' };

const EMBED = () => new Array(8).fill(0.1);

/** Fake de cliente Supabase que registra lo insertado. */
function fakeSb({ blob, embedError = false } = {}) {
  const state = { insertedChunks: [], docDeleted: false, docRow: null };

  const storage = {
    from: () => ({
      download: async () => ({ data: blob ?? new Blob(['contenido de prueba. '.repeat(50)], { type: 'text/plain' }), error: null }),
      remove: async () => ({ data: null, error: null }),
    }),
  };

  const from = (table) => {
    const o = {};
    o.insert = (payload) => {
      if (table === 'documents') {
        state.docRow = payload;
        return { select: () => ({ single: async () => ({ data: { id: 'doc-1', nombre: payload.nombre, creado_en: 'now' }, error: null }) }) };
      }
      if (table === 'chunks') {
        if (embedError && state.insertedChunks.length > 0) {
          return Promise.resolve({ error: { message: 'insert fail' } });
        }
        state.insertedChunks.push(...payload);
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    };
    o.select = () => o;
    o.eq = () => o;
    o.order = async () => ({ data: state.docRow ? [{ id: 'doc-1', nombre: 'guia.txt', archivo_path: 'p', creado_en: 'now' }] : [], error: null });
    o.single = async () => ({ data: state.docRow, error: null });
    o.maybeSingle = async () => ({ data: state.docRow, error: null });
    o.delete = () => {
      state.docDeleted = true;
      return { eq: async () => ({ error: null }) };
    };
    return o;
  };

  return { state, storage, from };
}

function buildApp(sb, ai) {
  return createApp({
    verifyToken: async () => user,
    createUserClient: () => sb,
    ai,
  });
}

const post = (app, body) =>
  request(app).post('/api/documents').set('Authorization', 'Bearer t').send(body);

describe('POST /api/documents', () => {
  const base = { nombre: 'guia.txt', path: `${USER_ID}/abc-guia.txt` };

  test('400 si el path no pertenece al usuario', async () => {
    const sb = fakeSb();
    const res = await post(buildApp(sb, { embed: EMBED }), { ...base, path: 'otro/x.txt' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PATH');
  });

  test('400 si el tipo no es pdf/txt/md', async () => {
    const sb = fakeSb();
    const res = await post(buildApp(sb, { embed: EMBED }), { nombre: 'a.exe', path: `${USER_ID}/a.exe` });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
  });

  test('413 si el archivo supera 10 MB', async () => {
    const sb = fakeSb({ blob: new Blob([new ArrayBuffer(11 * 1024 * 1024)]) });
    const res = await post(buildApp(sb, { embed: EMBED }), base);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  test('flujo feliz: crea documento + chunks con embeddings (passage)', async () => {
    const sb = fakeSb();
    const textosEmbed = [];
    const tipos = [];
    const ai = {
      embed: async (textos, tipo) => {
        textosEmbed.push(...textos);
        tipos.push(tipo);
        return textos.map(EMBED);
      },
    };
    const res = await post(buildApp(sb, ai), base);
    expect(res.status).toBe(201);
    expect(res.body.document.id).toBe('doc-1');
    expect(tipos).toEqual(['passage']);
    expect(textosEmbed.length).toBe(res.body.chunks);
    expect(sb.state.insertedChunks.length).toBe(res.body.chunks);
    expect(sb.state.insertedChunks[0].document_id).toBe('doc-1');
  });

  test('si fallan los embeddings hace rollback del documento', async () => {
    const sb = fakeSb();
    const ai = { embed: async () => { throw new Error('nim caído'); } };
    const res = await post(buildApp(sb, ai), base);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('EMBEDDING_FAILED');
    expect(sb.state.docDeleted).toBe(true);
  });
});
