import { quizSchema, extractJson, gradeAnswers, toSafeQuestions } from '../src/services/quizSchema.js';

const quizValido = {
  titulo: 'Quiz de prueba',
  preguntas: [
    { pregunta: '¿Qué es el RAG?', opciones: ['a', 'b', 'c', 'd'], correcta: 0, explicacion: 'Retrieval augmented generation' },
    { pregunta: '¿Qué es pgvector?', opciones: ['a', 'b', 'c', 'd'], correcta: 1, explicacion: 'Extensión de vectores' },
  ],
};

describe('quizSchema', () => {
  test('acepta un quiz válido', () => {
    expect(quizSchema.safeParse(quizValido).success).toBe(true);
  });

  test('rechaza opciones ≠ 4', () => {
    const bad = { ...quizValido, preguntas: [{ ...quizValido.preguntas[0], opciones: ['a', 'b', 'c'] }] };
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  test('rechaza correcta fuera de 0-3', () => {
    const bad = { ...quizValido, preguntas: [{ ...quizValido.preguntas[0], correcta: 4 }] };
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });
});

describe('extractJson', () => {
  test('extrae JSON de un bloque markdown', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(extractJson(raw)).toEqual({ a: 1 });
  });

  test('elimina razonamiento <think> antes del JSON', () => {
    const raw = '<think>pensando mucho...</think>Aquí va: {"titulo":"x"}';
    expect(extractJson(raw)).toEqual({ titulo: 'x' });
  });

  test('lanza si no hay JSON', () => {
    expect(() => extractJson('hola')).toThrow();
  });
});

describe('gradeAnswers', () => {
  const questions = [
    { id: 'q1', correcta: 0, opciones: ['a', 'b'], explicacion: 'e1' },
    { id: 'q2', correcta: 1, opciones: ['a', 'b'], explicacion: 'e2' },
  ];

  test('califica en servidor y cuenta puntaje', () => {
    const r = gradeAnswers(questions, [0, 0]);
    expect(r.puntaje).toBe(1);
    expect(r.total).toBe(2);
    expect(r.resultados[0].correcta).toBe(true);
    expect(r.resultados[1].correcta).toBe(false);
  });

  test('toSafeQuestions oculta la respuesta correcta', () => {
    const safe = toSafeQuestions(questions);
    expect(safe[0]).not.toHaveProperty('correcta');
    expect(safe[0]).toHaveProperty('opciones');
  });
});
