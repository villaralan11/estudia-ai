import { Link } from 'react-router-dom';
import Button from '../atoms/Button.jsx';
import Badge from '../atoms/Badge.jsx';
import EmptyState from '../molecules/EmptyState.jsx';
import Spinner from '../atoms/Spinner.jsx';

export default function DocumentList({ documents, loading, onDelete, deletingId }) {
  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }

  if (!documents.length) {
    return (
      <EmptyState
        title="Aún no tienes documentos"
        description="Sube un PDF, TXT o MD con tu material de estudio y empieza a chatear con él."
      />
    );
  }

  const fecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <ul className="doc-grid" style={{ listStyle: 'none', padding: 0 }}>
      {documents.map((d) => (
        <li key={d.id} className="card doc-card">
          <h3>{d.nombre}</h3>
          <div className="doc-card__meta">
            <Badge tone="accent">{fecha(d.creado_en)}</Badge>
          </div>
          <div className="doc-card__actions">
            <Link to={`/doc/${d.id}`}>
              <Button size="sm" variant="primary">
                Abrir
              </Button>
            </Link>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(d)}
              disabled={deletingId === d.id}
              aria-label={`Eliminar ${d.nombre}`}
            >
              {deletingId === d.id ? 'Borrando…' : 'Eliminar'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
