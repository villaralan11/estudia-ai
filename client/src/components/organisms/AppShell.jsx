import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import Button from '../atoms/Button.jsx';

export default function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Documentos' },
    { to: '/historial', label: 'Historial' },
  ];

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="container topbar__inner">
          <Link to="/" className="wordmark">
            estudia<em>·ai</em>
          </Link>
          <nav aria-label="Principal">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="topbar__link" end={l.to === '/'}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <span className="userchip">
              <span>{user.email}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
              >
                Salir
              </Button>
            </span>
          ) : null}
        </div>
      </header>
      <main className="container" id="contenido">
        {children}
      </main>
      <footer className="footer">
        <div className="container">
          estudia-ai · RAG con Supabase (pgvector + RLS) · hecho con React, Express y NVIDIA NIM
        </div>
      </footer>
    </>
  );
}
