import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import FormField from '../components/molecules/FormField.jsx';
import Input from '../components/atoms/Input.jsx';
import Button from '../components/atoms/Button.jsx';

export default function Registro() {
  usePageTitle('Crear cuenta');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const conSesion = await signUp(email.trim(), password);
      if (conSesion) navigate('/');
      else setAviso('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.');
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth__pitch">
        <h1>
          Tu material, tus preguntas, <em>tu progreso</em>.
        </h1>
        <p style={{ color: 'var(--muted)' }}>
          La IA responde únicamente con lo que está en tus documentos: si algo no aparece, te lo dice.
        </p>
      </section>
      <section className="card card--pop auth__card" aria-label="Crear cuenta">
        <h2>Crear cuenta</h2>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        {aviso ? (
          <p className="notice" role="status">
            {aviso}
          </p>
        ) : null}
        <form onSubmit={onSubmit}>
          <FormField label="Correo" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField
            label="Contraseña"
            htmlFor="password"
            hint="Mínimo 8 caracteres."
          >
            <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" block loading={busy}>
            Crear cuenta
          </Button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </div>
  );
}
