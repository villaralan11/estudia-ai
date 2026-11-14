import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';
import ChatPanel from '../components/organisms/ChatPanel.jsx';
import Button from '../components/atoms/Button.jsx';
import Spinner from '../components/atoms/Spinner.jsx';
import Input from '../components/atoms/Input.jsx';
import FormField from '../components/molecules/FormField.jsx';
import EmptyState from '../components/molecules/EmptyState.jsx';

export default function Documento() {
  const { id } = useParams();
  usePageTitle('Documento');
  const { session } = useAuth();
  const token = session?.access_token;
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('chat');

  // estado de la pestaña quiz
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [num, setNum] = useState(8);
  const [dificultad, setDificultad] = useState('media');
  const [generando, setGenerando] = useState(false);
  const [quizError, setQuizError] = useState(null);

  const nombre = useMemo(() => document?.nombre ?? 'Documento', [document]);

  useEffect(() => {
    let viva = true;
    (async () => {
      try {
        const data = await api('/api/documents', { token });
        const d = data.documents.find((x) => x.id === id);
        if (!viva) return;
        if (!d) throw new Error('Documento no encontrado.');
        setDocument(d);
      } catch (e) {
        if (viva) setError(e.message);
      } finally {
        if (viva) setLoading(false);
      }
    })();
    return () => {
      viva = false;
    };
  }, [id, token]);

  const cargarQuizzes = async () => {
    setQuizzesLoading(true);
    setQuizError(null);
    try {
      const data = await api(`/api/quizzes?document_id=${id}`, { token });
      setQuizzes(data.quizzes);
    } catch (e) {
      setQuizError(e.message);
    } finally {
      setQuizzesLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'quiz' && document) cargarQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, document]);

  async function generar() {
    setGenerando(true);
    setQuizError(null);
    try {
      const data = await api('/api/quizzes', {
        method: 'POST',
        body: { document_id: id, num_preguntas: Number(num), dificultad },
        token,
      });
      navigate(`/quiz/${data.quiz.id}`);
    } catch (e) {
      setQuizError(e.message);
    } finally {
      setGenerando(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }
  if (error || !document) {
    return (
      <EmptyState
        title="Documento no disponible"
        description={error || 'No se encontró el documento.'}
        actionLabel="Volver a mis documentos"
        onAction={() => navigate('/')}
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <p style={{ marginBottom: '0.2rem' }}>
          <Link to="/">← Mis documentos</Link>
        </p>
        <h1>{nombre}</h1>
      </header>

      <div className="tabs" role="tablist" aria-label="Secciones del documento">
        <button className="tab" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
          Chat
        </button>
        <button className="tab" role="tab" aria-selected={tab === 'quiz'} onClick={() => setTab('quiz')}>
          Quiz
        </button>
      </div>

      {tab === 'chat' ? <ChatPanel documentId={id} /> : null}

      {tab === 'quiz' ? (
        <section aria-label="Cuestionarios del documento">
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3>Generar un cuestionario</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <FormField label="Número de preguntas" htmlFor="num">
                <Input id="num" type="number" min="5" max="15" value={num} onChange={(e) => setNum(e.target.value)} />
              </FormField>
              <FormField label="Dificultad" htmlFor="dif">
                <select id="dif" className="select" value={dificultad} onChange={(e) => setDificultad(e.target.value)}>
                  <option value="facil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="dificil">Difícil</option>
                </select>
              </FormField>
              <div style={{ alignSelf: 'end' }}>
                <Button variant="primary" onClick={generar} loading={generando}>
                  Generar quiz
                </Button>
              </div>
            </div>
            {quizError ? (
              <p className="alert" role="alert">
                {quizError}
              </p>
            ) : null}
          </div>

          {quizzesLoading ? (
            <Spinner />
          ) : quizzes.length === 0 ? (
            <EmptyState title="Sin quizzes todavía" description="Genera el primero con el formulario de arriba." />
          ) : (
            <ul className="doc-grid" style={{ listStyle: 'none', padding: 0 }}>
              {quizzes.map((q) => (
                <li key={q.id} className="card doc-card">
                  <h3>{q.titulo}</h3>
                  <div className="doc-card__meta">{new Date(q.creado_en).toLocaleString('es-MX')}</div>
                  <div className="doc-card__actions">
                    <Link to={`/quiz/${q.id}`}>
                      <Button size="sm" variant="primary">
                        Contestar
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}
