/**
 * Divide texto en chunks (~size caracteres, solape overlap) respetando,
 * cuando puede, cortes naturales (párrafos, oraciones, espacios).
 */
export function chunkText(text, { size = 800, overlap = 100 } = {}) {
  if (size <= overlap) throw new Error('size debe ser mayor que overlap');

  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const cut = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf(' '),
      );
      if (cut > size * 0.6) end = start + cut + 1;
    }

    const part = clean.slice(start, end).trim();
    if (part) chunks.push(part);

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
