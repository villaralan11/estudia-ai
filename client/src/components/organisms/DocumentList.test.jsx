import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DocumentList from './DocumentList.jsx';

const docs = [
  { id: 'd1', nombre: 'guia-redes.pdf', creado_en: '2026-11-10T00:00:00Z' },
  { id: 'd2', nombre: 'apuntes-bd.md', creado_en: '2026-11-11T00:00:00Z' },
];

function renderList(props = {}) {
  return render(
    <MemoryRouter>
      <DocumentList loading={false} onDelete={() => {}} deletingId={null} {...props} />
    </MemoryRouter>,
  );
}

describe('DocumentList', () => {
  test('estado vacío cuando no hay documentos', () => {
    renderList({ documents: [] });
    expect(screen.getByText('Aún no tienes documentos')).toBeInTheDocument();
  });

  test('muestra spinner mientras carga', () => {
    render(
      <MemoryRouter>
        <DocumentList documents={[]} loading onDelete={() => {}} deletingId={null} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status', { name: 'Cargando…' })).toBeInTheDocument();
  });

  test('renderiza los documentos con acciones', () => {
    renderList({ documents: docs });
    expect(screen.getByText('guia-redes.pdf')).toBeInTheDocument();
    expect(screen.getByText('apuntes-bd.md')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Abrir' })).toHaveLength(2);
  });

  test('botón eliminar llama onDelete con el documento', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderList({ documents: docs, onDelete });
    await user.click(screen.getByRole('button', { name: 'Eliminar guia-redes.pdf' }));
    expect(onDelete).toHaveBeenCalledWith(docs[0]);
  });
});
