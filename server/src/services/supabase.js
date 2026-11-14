import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { config } from '../config.js';

// Node 20 no trae WebSocket nativo: supabase-js necesita un transporte explícito.
const nodeOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
};

// Cliente anónimo global: solo para verificar JWT (auth.getUser) y nada más.
let _anon;
export function getAnonClient() {
  if (!_anon) {
    _anon = createClient(
      config.supabaseUrl || 'http://localhost:54321',
      config.supabaseAnonKey || 'anon-key-placeholder',
      nodeOptions,
    );
  }
  return _anon;
}

/**
 * Cliente de Supabase POR REQUEST: lleva el JWT del usuario en el header,
 * así que PostgREST aplica RLS con la identidad del usuario.
 * Nunca usa service_role.
 */
export function createUserClient(token) {
  return createClient(
    config.supabaseUrl || 'http://localhost:54321',
    config.supabaseAnonKey || 'anon-key-placeholder',
    { ...nodeOptions, global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

/** Valida el JWT de Supabase y devuelve el usuario. Lanza si es inválido. */
export async function verifyToken(token) {
  const { data, error } = await getAnonClient().auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Token inválido o expirado');
    err.status = 401;
    err.code = 'INVALID_TOKEN';
    throw err;
  }
  return data.user;
}
