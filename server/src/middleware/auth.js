import { AppError, asyncHandler } from './error.js';

/**
 * Valida el JWT de Supabase (Authorization: Bearer <jwt>), adjunta
 * req.user y req.sb (cliente creado con el token del usuario → RLS aplica).
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Falta el token de acceso (Authorization: Bearer <jwt>)');
  }

  try {
    const user = await req.app.locals.verifyToken(token);
    req.user = { id: user.id, email: user.email };
    req.sb = req.app.locals.createUserClient(token);
    next();
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado');
  }
});
