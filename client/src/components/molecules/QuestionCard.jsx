export default function QuestionCard({ question, value, onChange, disabled = false, result }) {
  const answered = value !== undefined && value !== null;
  const showResult = Boolean(result);

  return (
    <article className="card question" aria-label={`Pregunta: ${question.pregunta}`}>
      <h3>{question.pregunta}</h3>
      <div className="question__options" role="group" aria-label="Opciones">
        {question.opciones.map((op, i) => {
          const selected = value === i;
          let extra = '';
          if (showResult) {
            if (result.correcta && selected) extra = ' option--correct';
            else if (!result.correcta && selected) extra = ' option--wrong';
            else if (!result.correcta && result.respuesta === i) extra = ' option--correct';
          }
          return (
            <button
              key={i}
              type="button"
              className={`option${extra}`}
              aria-pressed={selected}
              disabled={disabled || showResult}
              onClick={() => onChange(i)}
            >
              <span className="option__key" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{op}</span>
            </button>
          );
        })}
      </div>
      {showResult && result ? (
        <p className="explicacion">
          <strong>{result.correcta ? 'Correcto.' : `Incorrecto. Respuesta: ${String.fromCharCode(65 + result.respuesta)}.`}</strong>{' '}
          {result.explicacion}
        </p>
      ) : null}
      {answered && !showResult ? <p className="field__hint">Respuesta guardada.</p> : null}
    </article>
  );
}
