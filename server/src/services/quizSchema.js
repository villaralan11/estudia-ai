import { z } from 'zod';

/** Esquema estricto del quiz que devuelve la IA. */
export const quizSchema = z.object({
  titulo: z.string().min(3).max(160),
  preguntas: z
    .array(
      z.object({
        pregunta: z.string().min(5).max(400),
        opciones: z.array(z.string().min(1).max(300)).length(4),
        correcta: z.number().int().min(0).max(3),
        explicacion: z.string().min(5).max(800),
      }),
    )
    .min(1)
    .max(15),
});

/** Limpia razonamiento/markdown y extrae el primer objeto JSON válido. */
export function extractJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Respuesta vacía de la IA');
  }

  let s = raw.trim();
  s = s.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
  s = s.replace(/```(?:json)?/gi, '').replace(/```/g, '');

  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No se encontró JSON en la respuesta');
  }

  return JSON.parse(s.slice(first, last + 1));
}

/** Califica en el servidor (nunca en el cliente). */
export function gradeAnswers(questions, respuestas) {
  const resultados = questions.map((q, i) => ({
    question_id: q.id,
    correcta: q.correcta === respuestas[i],
    respuesta: respuestas[i] ?? null,
    opciones: q.opciones,
    explicacion: q.explicacion,
  }));
  const puntaje = resultados.filter((r) => r.correcta).length;
  return { puntaje, total: questions.length, resultados };
}

/** Devuelve las preguntas sin la respuesta correcta (para el cliente). */
export function toSafeQuestions(questions) {
  return questions.map((q) => ({
    id: q.id,
    pregunta: q.pregunta,
    opciones: q.opciones,
  }));
}
