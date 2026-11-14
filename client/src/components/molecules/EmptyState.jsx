import Button from '../atoms/Button.jsx';

export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
