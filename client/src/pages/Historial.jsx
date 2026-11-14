import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';
import Spinner from '../components/atoms/Spinner.jsx';
import EmptyState from '../components/molecules/EmptyState.jsx';

export default function Historial() {
  usePageTitle('Historial');
  const { session } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let viva = true;
    (async () => {
      try {
        const d = await api('/api/stats', { token });
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
  }, [token]);

  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Historial de estudio</h1>
        <p>Tus intentos de cuestionarios y tu promedio general.</p>
      </header>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      {data && data.intentos.length > 0 ? (
        <>
          <div className="kpis">
            <div className="card kpi">
              <div className="kpi__num">{data.total_intentos}</div>
              <div className="kpi__label">intentos realizados</div>
            </div>
            <div className="card kpi">
              <div className="kpi__num">{data.promedio ?? 0}%</div>
              <div className="kpi__label">promedio de aciertos</div>
            </div>
          </div>
          <ul className="hist" style={{ listStyle: 'none', padding: 0 }}>
            {data.intentos.map((i) => (
              <li key={i.id} className="card hist__row">
                <div>
                  <strong>{i.titulo}</strong>
                  <div className="hist__meta">
                    {new Date(i.creado_en).toLocaleString('es-MX')} ·{' '}
                    {i.document_id ? <Link to={`/doc/${i.document_id}`}>ver documento</Link> : null}
                  </div>
                </div>
                <span className="hist__score" aria-label={`Puntaje ${i.puntaje} de ${i.total}`}>
                  {i.puntaje}/{i.total} · {i.porcentaje}%
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          title="Sin intentos todavía"
          description="Genera un quiz desde cualquiera de tus documentos y aparecerá aquí."
          actionLabel="Ir a mis documentos"
        />
      )}
    </>
  );
}
