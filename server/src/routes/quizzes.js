import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../middleware/error.js';
import { quizSchema, extractJson, gradeAnswers, toSafeQuestions } from '../services/quizSchema.js';

export const quizzesRouter = Router();

const genSchema = z.object({
  document_id: z.string().uuid(),
  num_preguntas: z.coerce.number().int().min(5).max(15).default(8),
  dificultad: z.enum(['facil', 'media', 'dificil']).default('media'),
});

const attemptSchema = z.object({
  respuestas: z.array(z.number().int().min(0).max(3)),
});

const QUIZ_SYSTEM = `Eres un profesor que crea cuestionarios de opción múltiple EN ESPAÑOL basados ÚNICAMENTE en el MATERIAL proporcionado. Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto antes ni después) con esta forma exacta:
{"titulo":"...","preguntas":[{"pregunta":"...","opciones":["...","...","...","..."],"correcta":0,"explicacion":"..."}]}
"correcta" es el índice 0-3 de la opción correcta. Cada pregunta debe poder responderse con el material; no inventes datos externos.`;

async function generarQuizConIA(ai, contexto, num, dificultad) {
  const prompt = `MATERIAL:\n${contexto}\n\nGenera exactamente ${num} preguntas de dificultad ${dificultad} sobre el material. Recuerda: SOLO el JSON.`;
  const raw = await ai.chat(
    [
      { role: 'system', content: QUIZ_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.4, maxTokens: 3000 },
  );
  const parsed = extractJson(raw);
  const checked = quizSchema.safeParse(parsed);
  if (!checked.success) {
    throw new Error(checked.error.issues[0]?.message || 'Quiz inválido');
  }
  return checked.data;
}

quizzesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    let q = req.sb.from('quizzes').select('id,titulo,document_id,creado_en');
    if (req.query.document_id) {
      q = q.eq('document_id', String(req.query.document_id));
    }
    const { data, error } = await q.order('creado_en', { ascending: false });
    if (error) throw error;
    res.json({ quizzes: data ?? [] });
  }),
);

quizzesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = genSchema.parse(req.body);
    const ai = req.app.locals.ai;

    const { data: doc, error: docErr } = await req.sb
      .from('documents')
      .select('id,nombre')
      .eq('id', body.document_id)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'El documento no existe o no es tuyo');

    const { data: chunks, error: chErr } = await req.sb
      .from('chunks')
      .select('id,contenido')
      .eq('document_id', body.document_id)
      .limit(40);
    if (chErr) throw chErr;
    if (!chunks?.length) {
      throw new AppError(400, 'EMPTY_DOCUMENT', 'El documento no tiene contenido indexado');
    }

    const contexto = chunks
      .map((c) => c.contenido)
      .join('\n\n')
      .slice(0, 14000);

    let quizData;
    try {
      quizData = await generarQuizConIA(ai, contexto, body.num_preguntas, body.dificultad);
    } catch {
      try {
        // Un único reintento pidiendo STRICTamente el JSON.
        quizData = await generarQuizConIA(
          ai,
          contexto,
          body.num_preguntas,
          body.dificultad,
        );
      } catch {
        throw new AppError(502, 'QUIZ_INVALID', 'La IA no devolvió un quiz válido, inténtalo de nuevo');
      }
    }

    const { data: quiz, error: qErr } = await req.sb
      .from('quizzes')
      .insert({ user_id: req.user.id, document_id: body.document_id, titulo: quizData.titulo })
      .select('id,titulo,document_id,creado_en')
      .single();
    if (qErr || !quiz) throw new AppError(400, 'DB_ERROR', 'No se pudo guardar el quiz');

    try {
      const rows = quizData.preguntas.map((p) => ({
        quiz_id: quiz.id,
        pregunta: p.pregunta,
        opciones: p.opciones,
        correcta: p.correcta,
        explicacion: p.explicacion,
      }));
      const { error, data: saved } = await req.sb.from('questions').insert(rows).select();
      if (error) throw error;
      res.status(201).json({ quiz, questions: toSafeQuestions(saved ?? rows.map((r, i) => ({ id: `q${i}`, ...r }))) });
    } catch {
      await req.sb.from('quizzes').delete().eq('id', quiz.id);
      throw new AppError(400, 'DB_ERROR', 'No se pudieron guardar las preguntas');
    }
  }),
);

quizzesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { data: quiz, error: qErr } = await req.sb
      .from('quizzes')
      .select('id,titulo,document_id,creado_en')
      .eq('id', req.params.id)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!quiz) throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz no encontrado');

    const { data: questions, error } = await req.sb
      .from('questions')
      .select('id,pregunta,opciones')
      .eq('quiz_id', quiz.id);
    if (error) throw error;
    res.json({ quiz, questions: questions ?? [] });
  }),
);

quizzesRouter.post(
  '/:id/attempts',
  asyncHandler(async (req, res) => {
    const body = attemptSchema.parse(req.body);

    const { data: quiz, error: qErr } = await req.sb
      .from('quizzes')
      .select('id,titulo')
      .eq('id', req.params.id)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!quiz) throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz no encontrado');

    const { data: questions, error: qsErr } = await req.sb
      .from('questions')
      .select('id,pregunta,opciones,correcta,explicacion')
      .eq('quiz_id', quiz.id);
    if (qsErr) throw qsErr;

    if (body.respuestas.length !== questions?.length) {
      throw new AppError(
        400,
        'ANSWERS_MISMATCH',
        `Se esperaban ${questions?.length ?? 0} respuestas`,
      );
    }

    const { puntaje, total, resultados } = gradeAnswers(questions ?? [], body.respuestas);

    const { error: aErr } = await req.sb.from('attempts').insert({
      quiz_id: quiz.id,
      user_id: req.user.id,
      puntaje,
      total,
    });
    if (aErr) throw aErr;

    res.status(201).json({ quiz_id: quiz.id, titulo: quiz.titulo, puntaje, total, resultados });
  }),
);
