export function Spinner({ size = 16 }: { size?: number }): React.JSX.Element {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;
}
