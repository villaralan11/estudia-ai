export default function ChatBubble({ rol, content, fuentes = [] }) {
  return (
    <div className={`bubble bubble--${rol === 'user' ? 'user' : 'ai'}`}>
      <p>{content}</p>
      {rol !== 'user' && fuentes.length > 0 ? (
        <div className="bubble__fuentes">
          <span>Fuentes:</span>
          {fuentes.map((f) => (
            <span key={f} className="badge badge--muted">
              {String(f).slice(0, 8)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
