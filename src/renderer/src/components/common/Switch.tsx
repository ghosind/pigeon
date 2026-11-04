export function Switch({
  checked,
  onChange,
  label,
  danger = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  danger?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'on' : ''} ${danger ? 'danger' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
