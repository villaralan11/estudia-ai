import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { api } from '../../lib/api.js';
import Button from '../atoms/Button.jsx';

const MAX_MB = 10;
const ALLOWED = ['application/pdf', 'text/plain', 'text/markdown'];
const EXT = ['pdf', 'txt', 'md'];

export default function UploadPanel({ onUploaded }) {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState(null); // { tipo: 'info'|'error'|'ok', msg }
  const [busy, setBusy] = useState(false);

  async function manejarArchivo(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!EXT.includes(ext)) {
      setEstado({ tipo: 'error', msg: 'Formato no admitido: usa PDF, TXT o MD.' });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setEstado({ tipo: 'error', msg: `El archivo supera ${MAX_MB} MB.` });
      return;
    }

    setBusy(true);
    setEstado({ tipo: 'info', msg: 'Subiendo archivo a Storage…' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada, vuelve a iniciar sesión.');

      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('archivos')
        .upload(path, file, { upsert: false, contentType: file.type || ALLOWED[EXT.indexOf(ext)] });
      if (upErr) throw upErr;

      setEstado({ tipo: 'info', msg: 'Extrayendo texto y generando embeddings…' });
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await api('/api/documents', { method: 'POST', body: { nombre: file.name, path }, token });

      setEstado({ tipo: 'ok', msg: '¡Listo! Tu documento ya está indexado.' });
      onUploaded?.();
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setEstado({ tipo: 'error', msg: e.message || 'No se pudo procesar el archivo.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="upload" aria-label="Subir documento">
      <label className="upload__label">
        <span>Sube tu material de estudio</span>
        <span className="badge">PDF · TXT · MD · máx {MAX_MB} MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={busy}
          onChange={(e) => manejarArchivo(e.target.files?.[0])}
        />
        <Button variant="primary" loading={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Procesando…' : 'Elegir archivo'}
        </Button>
      </label>
      {estado ? (
        <p
          className={`upload__status${estado.tipo === 'error' ? ' upload__status--error' : ''}`}
          aria-live="polite"
        >
          {estado.msg}
        </p>
      ) : (
        <p className="upload__status">El texto se divide en chunks y se indexa con pgvector.</p>
      )}
    </section>
  );
}
