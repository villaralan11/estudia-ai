import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';
import UploadPanel from '../components/organisms/UploadPanel.jsx';
import DocumentList from '../components/organisms/DocumentList.jsx';

export default function Dashboard() {
  usePageTitle('Mis documentos');
  const { session } = useAuth();
  const token = session?.access_token;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/api/documents', { token });
      setDocuments(data.documents);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(doc) {
    if (!window.confirm(`¿Eliminar «${doc.nombre}» con su chat, quizzes y archivo?`)) return;
    setDeletingId(doc.id);
    try {
      await api(`/api/documents/${doc.id}`, { method: 'DELETE', token });
      setDocuments((ds) => ds.filter((d) => d.id !== doc.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <header className="page-head">
        <h1>Mis documentos</h1>
        <p>Sube tu material, chatea con él y crea cuestionarios. La IA solo responde con tu contenido.</p>
      </header>
      <UploadPanel onUploaded={cargar} />
      <div style={{ height: '1.5rem' }} />
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <DocumentList documents={documents} loading={loading} onDelete={borrar} deletingId={deletingId} />
    </>
  );
}
