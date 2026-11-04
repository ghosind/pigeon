import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} type="button" {...rest}>
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'default' | 'accent' | 'danger' | 'ghost';
}

export function IconButton({
  label,
  variant = 'default',
  className = '',
  children,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn-${variant} ${className}`}
      title={label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="kbd">{children}</kbd>;
}
