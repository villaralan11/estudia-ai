import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';

export const statsRouter = Router();

statsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.sb
      .from('attempts')
      .select('id,puntaje,total,creado_en,quizzes(id,titulo,document_id)')
      .order('creado_en', { ascending: false })
      .limit(100);
    if (error) throw error;

    const intentos = (data ?? []).map((a) => ({
      id: a.id,
      quiz_id: a.quizzes?.id,
      titulo: a.quizzes?.titulo ?? 'Quiz',
      document_id: a.quizzes?.document_id,
      puntaje: a.puntaje,
      total: a.total,
      porcentaje: a.total ? Math.round((a.puntaje / a.total) * 100) : 0,
      creado_en: a.creado_en,
    }));

    const promedio = intentos.length
      ? Math.round(
          (intentos.reduce((acc, i) => acc + i.puntaje / i.total, 0) / intentos.length) * 100,
        )
      : null;

    res.json({ total_intentos: intentos.length, promedio, intentos });
  }),
);
