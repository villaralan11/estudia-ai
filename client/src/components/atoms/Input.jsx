export default function Input({ error, ...rest }) {
  return <input className="input" aria-invalid={error ? 'true' : undefined} {...rest} />;
}
