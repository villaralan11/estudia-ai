import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizRunner from './QuizRunner.jsx';

const questions = [
  { id: 'q1', pregunta: '¿Qué es pgvector?', opciones: ['Una extensión', 'Un lenguaje', 'Una librería de JS', 'Un ORM'] },
  { id: 'q2', pregunta: '¿Qué hace RLS?', opciones: ['Nada', 'Filtra filas por usuario', 'Cifra archivos', 'Compila SQL'] },
];

describe('QuizRunner', () => {
  test('renderiza preguntas y contador de contestadas', () => {
    render(<QuizRunner questions={questions} onSubmit={() => {}} />);
    expect(screen.getByText('¿Qué es pgvector?')).toBeInTheDocument();
    expect(screen.getByText('0/2 contestadas')).toBeInTheDocument();
  });

  test('permite seleccionar opciones y bloquea entrega incompleta', async () => {
    const user = userEvent.setup();
    render(<QuizRunner questions={questions} onSubmit={() => {}} />);
    await user.click(screen.getAllByRole('button', { name: /Una extensión/ })[0]);
    expect(screen.getByText('1/2 contestadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar respuestas' })).toBeDisabled();
  });

  test('envía el arreglo de respuestas en orden al completar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuizRunner questions={questions} onSubmit={onSubmit} />);

    await user.click(screen.getAllByRole('button', { name: /Una extensión/ })[0]);
    await user.click(screen.getAllByRole('button', { name: /Filtra filas por usuario/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Entregar respuestas' }));

    expect(onSubmit).toHaveBeenCalledWith([0, 1]);
  });

  test('con resultado muestra el puntaje y explicaciones', () => {
    const result = {
      puntaje: 2,
      total: 2,
      resultados: [
        { question_id: 'q1', correcta: true, respuesta: 0, opciones: ['Una extensión'], explicacion: 'Es una extensión de Postgres.' },
        { question_id: 'q2', correcta: true, respuesta: 1, opciones: ['Filtra filas por usuario'], explicacion: 'RLS filtra por usuario.' },
      ],
    };
    render(<QuizRunner questions={questions} onSubmit={() => {}} result={result} />);
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText(/Es una extensión de Postgres/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entregar respuestas' })).not.toBeInTheDocument();
  });
});
