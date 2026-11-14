export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err?.name === 'ZodError') {
    const first = err.issues?.[0];
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: first ? `${first.path.join('.') || 'campo'}: ${first.message}` : 'Datos inválidos',
      },
    });
  }

  const status = err?.status ?? 500;
  const code = err?.code ?? (status === 500 ? 'INTERNAL' : 'ERROR');
  const message =
    status >= 500 ? 'Error interno del servidor' : err?.message || 'Error inesperado';

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[error]', err);
  }

  res.status(status).json({ error: { code, message } });
}

/** Envuelve handlers async para que los errores lleguen al errorHandler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
