import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../middleware/error.js';
import { chunkText } from '../services/chunker.js';
import { extractText } from '../services/pdf.js';
import { limits } from '../config.js';

const router = Router();

const createSchema = z.object({
  nombre: z.string().min(1).max(255),
  path: z.string().min(1).max(1024),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const ai = req.app.locals.ai;

    const ext = String(body.nombre).split('.').pop().toLowerCase();
    if (!limits.allowedExtensions.includes(ext)) {
      throw new AppError(400, 'UNSUPPORTED_TYPE', 'Solo se aceptan archivos PDF, TXT o MD');
    }
    if (!body.path.startsWith(`${req.user.id}/`)) {
      throw new AppError(400, 'INVALID_PATH', 'La ruta del archivo no pertenece al usuario');
    }

    const { data: blob, error: dlError } = await req.sb.storage
      .from('archivos')
      .download(body.path);
    if (dlError || !blob) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'No se pudo descargar el archivo de Storage');
    }
    if (blob.size > limits.maxFileBytes) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'El archivo supera el límite de 10 MB');
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const text = await extractText(buffer, body.nombre);
    if (!text.trim()) {
      throw new AppError(400, 'EMPTY_DOCUMENT', 'El archivo no contiene texto extraíble');
    }

    const chunks = chunkText(text).slice(0, limits.maxChunks);

    const { data: doc, error: insError } = await req.sb
      .from('documents')
      .insert({ user_id: req.user.id, nombre: body.nombre, archivo_path: body.path })
      .select('id,nombre,creado_en')
      .single();
    if (insError || !doc) {
      throw new AppError(400, 'DB_ERROR', 'No se pudo crear el documento');
    }

    try {
      for (let i = 0; i < chunks.length; i += limits.insertBatch) {
        const lote = chunks.slice(i, i + limits.insertBatch);
        const embeddings = await ai.embed(lote, 'passage');
        const rows = lote.map((contenido, j) => ({
          document_id: doc.id,
          contenido,
          embedding: embeddings[j],
        }));
        const { error } = await req.sb.from('chunks').insert(rows);
        if (error) throw error;
      }
    } catch {
      // Rollback: si falló a la mitad, no dejamos el documento a medias.
      await req.sb.from('documents').delete().eq('id', doc.id);
      throw new AppError(502, 'EMBEDDING_FAILED', 'Falló la generación de embeddings');
    }

    res.status(201).json({ document: doc, chunks: chunks.length });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.sb
      .from('documents')
      .select('id,nombre,archivo_path,creado_en')
      .order('creado_en', { ascending: false });
    if (error) throw error;
    res.json({ documents: data ?? [] });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { data: doc, error: selError } = await req.sb
      .from('documents')
      .select('id,archivo_path')
      .eq('id', req.params.id)
      .maybeSingle();
    if (selError) throw selError;
    if (!doc) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');

    await req.sb.storage.from('archivos').remove([doc.archivo_path]);

    const { error } = await req.sb.from('documents').delete().eq('id', doc.id);
    if (error) throw error;
    res.status(204).end();
  }),
);

export default router;
