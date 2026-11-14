import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';
import QuizRunner from '../components/organisms/QuizRunner.jsx';
import Spinner from '../components/atoms/Spinner.jsx';
import EmptyState from '../components/molecules/EmptyState.jsx';
import Badge from '../components/atoms/Badge.jsx';

export default function Quiz() {
  const { id } = useParams();
  const { session } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  usePageTitle('Quiz');

  useEffect(() => {
    let viva = true;
    (async () => {
      try {
        const d = await api(`/api/quizzes/${id}`, { token });
        if (viva) setData(d);
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

  async function entregar(respuestas) {
    setSubmitting(true);
    setError(null);
    try {
      const r = await api(`/api/quizzes/${id}/attempts`, { method: 'POST', body: { respuestas }, token });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }
  if (error || !data) {
    return (
      <EmptyState
        title="Quiz no disponible"
        description={error || 'No se encontró este quiz.'}
        actionLabel="Volver a mis documentos"
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <p style={{ marginBottom: '0.2rem' }}>
          <Link to={`/doc/${data.quiz.document_id}`}>← Volver al documento</Link>
        </p>
        <h1>{data.quiz.titulo}</h1>
        <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Badge tone="accent">{data.questions.length} preguntas</Badge>
          <Badge>Responde todas y entrega</Badge>
        </p>
      </header>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <QuizRunner
        questions={data.questions}
        onSubmit={entregar}
        submitting={submitting}
        result={result}
      />
    </>
  );
}
