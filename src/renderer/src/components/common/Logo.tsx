export function Logo({ size = 30 }: { size?: number }): React.JSX.Element {
  return (
    <img
      className="pigeon-logo"
      src="./logo.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
