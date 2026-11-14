import OpenAI from 'openai';
import { config, limits } from '../config.js';

let _client;

function client() {
  if (!_client) {
    if (!config.nvidiaApiKey) {
      throw Object.assign(new Error('Falta NVIDIA_API_KEY'), { status: 500, code: 'AI_CONFIG' });
    }
    _client = new OpenAI({
      apiKey: config.nvidiaApiKey,
      baseURL: config.nvidiaBaseUrl,
    });
  }
  return _client;
}

/**
 * Embeddings con NVIDIA NIM.
 * tipo: 'passage' al guardar contenido, 'query' al buscar con una pregunta.
 * Devuelve un vector por texto (1024 dims con nv-embedqa-e5-v5).
 */
export async function embed(textos, tipo = 'passage') {
  if (!Array.isArray(textos) || textos.length === 0) return [];
  const salida = [];

  for (let i = 0; i < textos.length; i += limits.embedBatch) {
    const lote = textos.slice(i, i + limits.embedBatch);
    const res = await client().embeddings.create({
      model: config.embedModel,
      input: lote,
      input_type: tipo,
    });
    if (!res?.data || res.data.length !== lote.length) {
      throw Object.assign(new Error('La API devolvió un número incorrecto de embeddings'), {
        status: 502,
        code: 'AI_BAD_RESPONSE',
      });
    }
    salida.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }

  return salida;
}

/** Chat con NVIDIA NIM. Devuelve el texto de respuesta. */
export async function chat(messages, { temperature = 0.2, maxTokens = 1024 } = {}) {
  const res = await client().chat.completions.create({
    model: config.chatModel,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });
  return res?.choices?.[0]?.message?.content?.trim() || '';
}
