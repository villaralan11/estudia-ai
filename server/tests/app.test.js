import request from 'supertest';
import { createApp } from '../src/app.js';
import { chunkText } from '../src/services/chunker.js';

const user = { id: '11111111-1111-1111-1111-111111111111', email: 'a@test.com' };

function buildApp() {
  return createApp({
    verifyToken: async (token) => {
      if (token === 'good-token') return user;
      const err = new Error('bad');
      err.status = 401;
      throw err;
    },
    createUserClient: () => ({}),
    ai: {},
  });
}

describe('app base', () => {
  test('GET /health responde 200', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('ruta protegida sin token → 401 con formato de error', async () => {
    const res = await request(buildApp()).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('token inválido → 401', async () => {
    const res = await request(buildApp())
      .get('/api/documents')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('token válido pasa el middleware (llega a la ruta)', async () => {
    const app = createApp({
      verifyToken: async () => user,
      createUserClient: () => ({
        from: () => {
          const o = {};
          o.select = () => o;
          o.order = async () => ({ data: [], error: null });
          return o;
        },
      }),
      ai: {},
    });
    const res = await request(app).get('/api/documents').set('Authorization', 'Bearer good-token');
    expect(res.status).toBe(200);
    expect(res.body.documents).toEqual([]);
  });

  test('ruta desconocida → 404 con formato de error', async () => {
    const res = await request(buildApp()).get('/desconocida');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('chunker', () => {
  test('chunks de 2000 chars → tamaños ≤ 800 con solape exacto', () => {
    const chunks = chunkText('a'.repeat(2000), { size: 800, overlap: 100 });
    expect(chunks.length).toBe(3);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(800));
    expect(chunks[1].startsWith(chunks[0].slice(-100))).toBe(true);
    expect(chunks[2].startsWith(chunks[1].slice(-100))).toBe(true);
  });

  test('texto vacío → []', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  test('texto corto → un solo chunk', () => {
    const chunks = chunkText('Hola mundo', { size: 800, overlap: 100 });
    expect(chunks).toEqual(['Hola mundo']);
  });
});
