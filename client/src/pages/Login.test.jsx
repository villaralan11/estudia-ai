import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: vi.fn(),
}));

const signIn = vi.fn();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ session: null, user: null, loading: false, signIn, signUp: vi.fn(), signOut: vi.fn() });
  });

  test('muestra el formulario con labels accesibles', () => {
    renderLogin();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  test('envía credenciales a signIn y navega al dashboard', async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValueOnce();
    renderLogin();

    await user.type(screen.getByLabelText('Correo'), 'alan@ejemplo.mx');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(signIn).toHaveBeenCalledWith('alan@ejemplo.mx', 'secreta123');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  test('muestra error amable con credenciales inválidas', async () => {
    const user = userEvent.setup();
    signIn.mockRejectedValueOnce(new Error('Invalid login credentials'));
    renderLogin();

    await user.type(screen.getByLabelText('Correo'), 'alan@ejemplo.mx');
    await user.type(screen.getByLabelText('Contraseña'), 'malaclave');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });
});
