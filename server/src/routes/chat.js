import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../middleware/error.js';
import { limits } from '../config.js';

export const chatRouter = Router();
export const messagesRouter = Router();

const chatSchema = z.object({
  chat_id: z.string().uuid().optional(),
  document_id: z.string().uuid(),
  pregunta: z.string().min(1).max(2000),
});

export const RAG_SYSTEM = `Eres un asistente de estudio. Responde la pregunta del usuario usando ÚNICAMENTE la información del CONTEXTO (fragmentos del documento). Reglas:
1. Si la respuesta está en el contexto, cítala con [Fuente N].
2. Si NO está en el contexto, responde exactamente: "No aparece en el documento."
3. Nunca uses conocimiento externo ni inventes datos.
4. Responde en español, de forma clara y breve.`;

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = chatSchema.parse(req.body);
    const ai = req.app.locals.ai;

    const { data: doc, error: docErr } = await req.sb
      .from('documents')
      .select('id,nombre')
      .eq('id', body.document_id)
      .maybeSingle();
    if (docErr) throw docErr;
    if (!doc) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'El documento no existe o no es tuyo');

    let chatId = body.chat_id;
    if (chatId) {
      const { data: chat, error: chatErr } = await req.sb
        .from('chats')
        .select('id,document_id')
        .eq('id', chatId)
        .maybeSingle();
      if (chatErr) throw chatErr;
      if (!chat || chat.document_id !== body.document_id) {
        throw new AppError(404, 'CHAT_NOT_FOUND', 'El chat no existe para este documento');
      }
    } else {
      const { data: chat, error: chatErr } = await req.sb
        .from('chats')
        .insert({ user_id: req.user.id, document_id: body.document_id })
        .select('id')
        .single();
      if (chatErr || !chat) throw new AppError(400, 'DB_ERROR', 'No se pudo crear el chat');
      chatId = chat.id;
    }

    const { data: history, error: histErr } = await req.sb
      .from('messages')
      .select('rol,contenido')
      .eq('chat_id', chatId)
      .order('creado_en', { ascending: false })
      .limit(limits.maxHistoryMessages);
    if (histErr) throw histErr;
    const previos = (history ?? [])
      .reverse()
      .map((m) => ({ role: m.rol === 'ai' ? 'assistant' : 'user', content: m.contenido }));

    const vectores = await ai.embed([body.pregunta], 'query');
    const { data: matches, error: matchErr } = await req.sb.rpc('match_chunks', {
      query_embedding: vectores[0],
      doc_id: body.document_id,
      match_count: limits.matchCount,
    });
    if (matchErr) throw matchErr;
    const fuentes = matches ?? [];

    let respuesta;
    if (fuentes.length === 0) {
      respuesta = 'No aparece en el documento.';
    } else {
      const contexto = fuentes
        .map((m, i) => `[Fuente ${i + 1} · chunk ${m.id}]\n${m.contenido}`)
        .join('\n\n');
      const mensajes = [
        { role: 'system', content: `${RAG_SYSTEM}\n\nCONTEXTO:\n${contexto}` },
        ...previos,
        { role: 'user', content: `Pregunta: ${body.pregunta}` },
      ];
      respuesta = (await ai.chat(mensajes, { temperature: 0.2, maxTokens: 900 })) ||
        'No aparece en el documento.';
    }

    const { error: msgErr } = await req.sb.from('messages').insert([
      { chat_id: chatId, rol: 'user', contenido: body.pregunta },
      { chat_id: chatId, rol: 'ai', contenido: respuesta },
    ]);
    if (msgErr) throw msgErr;

    res.json({ chat_id: chatId, respuesta, fuentes: fuentes.map((m) => m.id) });
  }),
);

messagesRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { data: chat, error: chatErr } = await req.sb
      .from('chats')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (chatErr) throw chatErr;
    if (!chat) throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat no encontrado');

    const { data, error } = await req.sb
      .from('messages')
      .select('id,rol,contenido,creado_en')
      .eq('chat_id', req.params.id)
      .order('creado_en', { ascending: true });
    if (error) throw error;
    res.json({ chat_id: req.params.id, messages: data ?? [] });
  }),
);
