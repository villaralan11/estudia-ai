import { api } from '../lib/api.js';
import { useAuth } from './useAuth.jsx';

/** Devuelve una función fetch que adjunta el JWT de la sesión actual. */
export function useApi() {
  const { session } = useAuth();
  return (path, opts = {}) => api(path, { ...opts, token: session?.access_token });
}
