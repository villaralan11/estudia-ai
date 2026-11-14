export default function Spinner({ large, label = 'Cargando…' }) {
  return (
    <span role="status" aria-label={label} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
      <span className={`spinner${large ? ' spinner--lg' : ''}`} aria-hidden="true" />
    </span>
  );
}
