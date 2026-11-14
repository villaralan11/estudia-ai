import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import AppShell from './components/organisms/AppShell.jsx';
import Spinner from './components/atoms/Spinner.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documento from './pages/Documento.jsx';
import Quiz from './pages/Quiz.jsx';
import Historial from './pages/Historial.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-page">
        <Spinner large />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;
  return children;
}

function Shell({ children }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/registro"
            element={
              <PublicOnly>
                <Registro />
              </PublicOnly>
            }
          />
          <Route
            path="/"
            element={
              <Protected>
                <Shell>
                  <Dashboard />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/doc/:id"
            element={
              <Protected>
                <Shell>
                  <Documento />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <Protected>
                <Shell>
                  <Quiz />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="/historial"
            element={
              <Protected>
                <Shell>
                  <Historial />
                </Shell>
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <Shell>
                <NotFound />
              </Shell>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
