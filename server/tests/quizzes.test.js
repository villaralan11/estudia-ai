import request from 'supertest';
import { createApp } from '../src/app.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const DOC_ID = '22222222-2222-2222-2222-222222222222';
const QUIZ_ID = '33333333-3333-3333-3333-333333333333';
const user = { id: USER_ID, email: 'a@test.com' };

function quizJSON(num = 5) {
  return JSON.stringify({
    titulo: 'Quiz de redes',
    preguntas: Array.from({ length: num }, (_, i) => ({
      pregunta: `Pregunta ${i + 1} sobre el material`,
      opciones: ['a', 'b', 'c', 'd'],
      correcta: i % 4,
      explicacion: `Explicación ${i + 1}`,
    })),
  });
}

function fakeSb(map = {}) {
  const log = { quizInserts: 0, questionInserts: [], attemptInserts: [] };
  const sb = {
    log,
    from(table) {
      const entry = map[table] ?? {};
      const o = {};
      ['select', 'eq', 'order', 'limit'].forEach((m) => { o[m] = () => o; });
      o.insert = (payload) => {
        if (table === 'quizzes') log.quizInserts += 1;
        if (table === 'attempts') log.attemptInserts.push(payload);
        if (table === 'questions') {
          log.questionInserts.push(...payload);
          return { select: async () => ({ data: payload.map((r, i) => ({ id: `q${i}`, ...r })), error: null }) };
        }
        if (entry.singleOnInsert) return { select: () => ({ single: async () => ({ data: entry.single, error: null }) }) };
        return Promise.resolve({ data: null, error: null });
      };
      o.maybeSingle = async () => ({ data: entry.single ?? null, error: null });
      o.single = async () => ({ data: entry.single ?? null, error: null });
      o.then = (res, rej) => Promise.resolve({ data: entry.rows ?? [], error: null }).then(res, rej);
      return o;
    },
  };
  return sb;
}

function buildApp(sb, ai) {
  return createApp({
    verifyToken: async () => user,
    createUserClient: () => sb,
    ai,
  });
}

describe('POST /api/quizzes', () => {
  const body = { document_id: DOC_ID, num_preguntas: 5 };

  test('genera quiz válido con IA mockeada y guarda preguntas', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chunks: { rows: [{ id: 'c1', contenido: 'TCP es un protocolo de transporte fiable. ' }] },
      quizzes: { singleOnInsert: true, single: { id: QUIZ_ID, titulo: 'Quiz de redes', document_id: DOC_ID, creado_en: 'now' } },
    };
    const sb = fakeSb(map);
    let calls = 0;
    const ai = { chat: async () => { calls += 1; return quizJSON(5); } };
    const res = await request(buildApp(sb, ai)).post('/api/quizzes').set('Authorization', 'Bearer t').send(body);

    expect(res.status).toBe(201);
    expect(res.body.quiz.id).toBe(QUIZ_ID);
    expect(res.body.questions).toHaveLength(5);
    expect(res.body.questions[0]).not.toHaveProperty('correcta');
    expect(calls).toBe(1);
    expect(sb.log.questionInserts).toHaveLength(5);
  });

  test('reintenta una vez si la IA devuelve basura y falla con 502', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chunks: { rows: [{ id: 'c1', contenido: 'x' }] },
    };
    const sb = fakeSb(map);
    let calls = 0;
    const ai = { chat: async () => { calls += 1; return 'no soy json'; } };
    const res = await request(buildApp(sb, ai)).post('/api/quizzes').set('Authorization', 'Bearer t').send(body);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('QUIZ_INVALID');
    expect(calls).toBe(2);
  });

  test('400 si el documento no tiene chunks', async () => {
    const map = {
      documents: { single: { id: DOC_ID, nombre: 'guia.pdf' } },
      chunks: { rows: [] },
    };
    const sb = fakeSb(map);
    const res = await request(buildApp(sb, { chat: async () => '' })).post('/api/quizzes').set('Authorization', 'Bearer t').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_DOCUMENT');
  });
});

describe('POST /api/quizzes/:id/attempts', () => {
  const questions = Array.from({ length: 5 }, (_, i) => ({
    id: `q${i}`,
    pregunta: `P${i}`,
    opciones: ['a', 'b', 'c', 'd'],
    correcta: i % 4,
    explicacion: `e${i}`,
  }));

  test('califica en servidor y guarda el intento', async () => {
    const map = {
      quizzes: { single: { id: QUIZ_ID, titulo: 'Quiz de redes' } },
      questions: { rows: questions },
    };
    const sb = fakeSb(map);
    const respuestas = questions.map((q) => q.correcta); // 5/5
    const res = await request(buildApp(sb, {})).post(`/api/quizzes/${QUIZ_ID}/attempts`).set('Authorization', 'Bearer t').send({ respuestas });

    expect(res.status).toBe(201);
    expect(res.body.puntaje).toBe(5);
    expect(res.body.total).toBe(5);
    expect(sb.log.attemptInserts).toEqual([{ quiz_id: QUIZ_ID, user_id: USER_ID, puntaje: 5, total: 5 }]);
  });

  test('400 si el número de respuestas no coincide', async () => {
    const map = {
      quizzes: { single: { id: QUIZ_ID, titulo: 'x' } },
      questions: { rows: questions },
    };
    const sb = fakeSb(map);
    const res = await request(buildApp(sb, {})).post(`/api/quizzes/${QUIZ_ID}/attempts`).set('Authorization', 'Bearer t').send({ respuestas: [0, 0] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ANSWERS_MISMATCH');
  });
});
