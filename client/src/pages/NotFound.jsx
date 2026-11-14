import { usePageTitle } from '../hooks/usePageTitle.js';
import EmptyState from '../components/molecules/EmptyState.jsx';

export default function NotFound() {
  usePageTitle('Página no encontrada');
  return (
    <EmptyState
      title="404 · Página no encontrada"
      description="La dirección que buscas no existe o cambió."
    />
  );
}
