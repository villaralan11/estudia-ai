export default function Button({
  variant = 'outline',
  size,
  block,
  loading,
  disabled,
  type = 'button',
  children,
  ...rest
}) {
  const cls = [
    'btn',
    variant !== 'outline' ? `btn--${variant}` : '',
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? '…' : children}
    </button>
  );
}
