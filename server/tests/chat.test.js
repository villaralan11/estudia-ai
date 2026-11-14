import request from 'supertest';
import { createApp } from '../src/app.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const DOC_ID = '22222222-2222-2222-2222-222222222222';
const CHAT_ID = '33333333-3333-3333-3333-333333333333';
const user = { id: USER_ID, email: 'a@test.com' };

const chunkIds = ['c1', 'c2', 'c3', 'c4', 'c5'];

/** Fake genérico de cliente Supabase por tabla. */
function fakeSb(map = {}) {
  const log = { chatInserts: 0, messageInserts: [] };
  const sb = {
    log,
    from(table) {
      const entry = map[table] ?? {};
      const o = {};
      ['select', 'eq', 'order', 'limit'].forEach((m) => { o[m] = () => o; });
      o.insert = (payload) => {
        if (table === 'chats') log.chatInserts += 1;
        if (table === 'messages') log.messageInserts.push(...payload);
        if (entry.singleOnInsert) return { select: () => ({ single: async () => ({ data: entry.single, error: null }) }) };
        return Promise.resolve({ data: null, error: null });
      };
      o.maybeSingle = async () => ({ data: entry.single ?? null, error: null });
      o.single = async () => ({ data: entry.single ?? null, error: null });
      o.then = (res, rej) => Promise.resolve({ data: entry.rows ?? [], error: null }).then(res, rej);
      return o;
    },
    rpc: async () => ({ data: chunkIds.map((id, i) => ({ id, contenido: `contenido ${i}`, similitud: 0.9 - i * 0.1 })), error: null }),
  };
  return sb;
}

function buildApp(sb, aiResp = 'Respuesta basada en el contexto.') {
  return createApp({
    verifyToken: async () => user,
    createUserClient: () => sb,
    ai: { embed: async (textos, tipo) => (tipo === 'query' ? textos.map(() => [0.1]) : textos.map(() => [0.1])), chat: async () => aiResp },
  });
}

const post = (app, body) => request(app).post('/api/chat').set('Authorization', 'Bearer t').send(body);

describe('POST /api/chat', () => {
  test('flujo feliz: crea chat, guarda 2 mensajes y devuelve fuentes', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chats: { singleOnInsert: true, single: { id: CHAT_ID } },
      messages: { rows: [] },
    };
    const sb = fakeSb(map);
    const res = await post(buildApp(sb), { document_id: DOC_ID, pregunta: '¿De qué trata?' });

    expect(res.status).toBe(200);
    expect(res.body.chat_id).toBe(CHAT_ID);
    expect(res.body.respuesta).toBe('Respuesta basada en el contexto.');
    expect(res.body.fuentes).toEqual(chunkIds);
    expect(sb.log.chatInserts).toBe(1);
    expect(sb.log.messageInserts).toHaveLength(2);
    expect(sb.log.messageInserts[0].rol).toBe('user');
    expect(sb.log.messageInserts[1].rol).toBe('ai');
  });

  test('reutiliza chat existente (no crea uno nuevo)', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chats: { single: { id: CHAT_ID, document_id: DOC_ID } },
      messages: { rows: [] },
    };
    const sb = fakeSb(map);
    const res = await post(buildApp(sb), { chat_id: CHAT_ID, document_id: DOC_ID, pregunta: 'hola' });
    expect(res.status).toBe(200);
    expect(res.body.chat_id).toBe(CHAT_ID);
    expect(sb.log.chatInserts).toBe(0);
  });

  test('404 si el chat no corresponde al documento', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chats: { single: { id: CHAT_ID, document_id: '99999999-9999-9999-9999-999999999999' } },
    };
    const sb = fakeSb(map);
    const res = await post(buildApp(sb), { chat_id: CHAT_ID, document_id: DOC_ID, pregunta: 'hola' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CHAT_NOT_FOUND');
  });

  test('sin chunks → "No aparece en el documento." sin llamar a la IA de chat', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chats: { singleOnInsert: true, single: { id: CHAT_ID } },
    };
    const sb = fakeSb(map);
    sb.rpc = async () => ({ data: [], error: null });
    let chatCalls = 0;
    const app = createApp({
      verifyToken: async () => user,
      createUserClient: () => sb,
      ai: { embed: async () => [[0.1]], chat: async () => { chatCalls += 1; return 'no debería'; } },
    });
    const res = await post(app, { document_id: DOC_ID, pregunta: '¿hola?' });
    expect(res.status).toBe(200);
    expect(res.body.respuesta).toBe('No aparece en el documento.');
    expect(res.body.fuentes).toEqual([]);
    expect(chatCalls).toBe(0);
  });

  test('400 si el body es inválido', async () => {
    const sb = fakeSb();
    const res = await post(buildApp(sb), { document_id: 'no-uuid', pregunta: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/chats/:id/messages', () => {
  test('devuelve el historial del chat', async () => {
    const map = {
      chats: { single: { id: CHAT_ID } },
      messages: { rows: [{ id: 'm1', rol: 'user', contenido: 'hola', creado_en: 'now' }] },
    };
    const sb = fakeSb(map);
    const res = await request(buildApp(sb)).get(`/api/chats/${CHAT_ID}/messages`).set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });

  test('404 si el chat no existe (RLS o inexistente)', async () => {
    const sb = fakeSb({});
    const res = await request(buildApp(sb)).get(`/api/chats/${CHAT_ID}/messages`).set('Authorization', 'Bearer t');
    expect(res.status).toBe(404);
  });
});
