import 'dotenv/config';

const env = (k, d = '') => process.env[k] ?? d;

export const config = {
  port: Number(env('PORT', 3001)),
  supabaseUrl: env('SUPABASE_URL'),
  supabaseAnonKey: env('SUPABASE_ANON_KEY'),
  nvidiaApiKey: env('NVIDIA_API_KEY'),
  nvidiaBaseUrl: env('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
  chatModel: env('AI_CHAT_MODEL', 'nvidia/nemotron-3-nano-30b-a3b'),
  embedModel: env('AI_EMBED_MODEL', 'nvidia/nv-embedqa-e5-v5'),
  clientOrigins: env('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
};

export const limits = {
  maxFileBytes: 10 * 1024 * 1024, // 10 MB
  allowedExtensions: ['pdf', 'txt', 'md'],
  maxChunks: 500,
  embedBatch: 16,
  insertBatch: 50,
  maxHistoryMessages: 6,
  matchCount: 5,
};
