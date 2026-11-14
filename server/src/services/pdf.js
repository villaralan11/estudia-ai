import { createRequire } from 'node:module';
import { AppError } from '../middleware/error.js';

// pdf-parse 1.1.1 lee un archivo de test al importar el entrypoint principal;
// importar lib/pdf-parse.js directamente lo evita.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// En Vercel serverless, pdf-parse no resuelve los assets de pdf.js (worker/cmaps).
// Se incluyen vía vercel.json (includeFiles) y se apuntan a su ruta en disco.
if (process.env.VERCEL === '1') {
  try {
    const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      '/var/task/server/node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js';
  } catch {
    /* pdf.js no disponible; pdfParse fallará con mensaje claro */;
  }
}

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
