import { useState } from 'react';
import QuestionCard from '../molecules/QuestionCard.jsx';
import Button from '../atoms/Button.jsx';

/**
 * QuizRunner: controla la selección de respuestas, el envío de intento
 * y el despliegue del resultado (calificado en el servidor).
 */
export default function QuizRunner({ questions, onSubmit, submitting, result }) {
  const [respuestas, setRespuestas] = useState({});

  const contestadas = questions.filter((q) => respuestas[q.id] !== undefined).length;
  const completo = contestadas === questions.length && questions.length > 0;

  function marcar(id, i) {
    setRespuestas((r) => ({ ...r, [id]: i }));
  }

  function enviar() {
    if (!completo) return;
    const arreglo = questions.map((q) => respuestas[q.id]);
    onSubmit(arreglo);
  }

  if (result) {
    const bueno = result.puntaje / result.total >= 0.6;
    return (
      <section aria-label="Resultado del intento">
        <div className={`score${bueno ? ' score--good' : ' score--bad'}`}>
          <span className="score__big">
            {result.puntaje}/{result.total}
          </span>
          <span>
            {bueno ? '¡Bien! Sigue repasando los puntos fallados.' : 'Vale, repasa el material y vuelve a intentarlo.'}
          </span>
        </div>
        <div className="quiz">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} value={respuestas[q.id]} disabled result={result.resultados.find((r) => r.question_id === q.id)} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Cuestionario">
      <div className="quiz">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} value={respuestas[q.id]} onChange={(i) => marcar(q.id, i)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem' }}>
        <Button variant="primary" onClick={enviar} loading={submitting} disabled={!completo}>
          Entregar respuestas
        </Button>
        <span className="field__hint" aria-live="polite">
          {contestadas}/{questions.length} contestadas
        </span>
      </div>
    </section>
  );
}
