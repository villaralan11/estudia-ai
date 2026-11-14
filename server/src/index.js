import { createApp } from './app.js';
import { config } from './config.js';

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn('[advertencia] Faltan SUPABASE_URL / SUPABASE_ANON_KEY en el entorno');
}
if (!config.nvidiaApiKey) {
  console.warn('[advertencia] Falta NVIDIA_API_KEY en el entorno');
}

const app = createApp();
app.listen(config.port, () => {
  console.log(`estudia-ai API escuchando en http://localhost:${config.port}`);
});
