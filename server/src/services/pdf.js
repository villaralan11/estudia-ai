import { createRequire } from 'node:module';
import { AppError } from '../middleware/error.js';

// pdf-parse 1.1.1 lee un archivo de test al importar el entrypoint principal;
// importar lib/pdf-parse.js directamente lo evita.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/** Extrae texto plano de un buffer según la extensión del archivo. */
export async function extractText(buffer, filename) {
  const ext = String(filename).split('.').pop().toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf8');
  }

  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return (data?.text || '').split('\u0000').join('');
  }

  throw new AppError(400, 'UNSUPPORTED_TYPE', `Tipo de archivo no soportado: .${ext}`);
}
