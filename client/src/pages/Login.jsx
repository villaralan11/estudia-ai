import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import FormField from '../components/molecules/FormField.jsx';
import Input from '../components/atoms/Input.jsx';
import Button from '../components/atoms/Button.jsx';

export default function Login() {
  usePageTitle('Iniciar sesión');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : err.message || 'No se pudo iniciar sesión.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth__pitch">
        <h1>
          Estudia con <em>tu propio material</em>, no con resúmenes de internet.
        </h1>
        <ul className="auth__points">
          <li>Sube tus PDF, TXT o MD de clase.</li>
          <li>Pregunta y responde solo con tu material (RAG + pgvector).</li>
          <li>Genera cuestionarios y mide tu progreso.</li>
        </ul>
      </section>
      <section className="card card--pop auth__card" aria-label="Iniciar sesión">
        <h2>Iniciar sesión</h2>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmit}>
          <FormField label="Correo" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Contraseña" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <Button type="submit" variant="primary" block loading={busy}>
            Entrar
          </Button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          ¿Sin cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </section>
    </div>
  );
}
