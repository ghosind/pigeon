import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuAction {
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

interface MenuProps {
  trigger: ReactNode;
  items: MenuAction[];
  align?: 'left' | 'right';
  width?: number;
  className?: string;
}

export function Menu({ trigger, items, align = 'right', width = 230, className = '' }: MenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`menu-root ${className}`} ref={ref}>
      <div
        className="menu-trigger"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div className={`menu-pop ${align}`} style={{ width }} role="menu">
          {items.map((item, index) =>
            item.separator ? (
              <div className="menu-sep" key={`sep-${index}`} />
            ) : (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role="menuitem"
                className={`menu-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-label">{item.label}</span>
                {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
