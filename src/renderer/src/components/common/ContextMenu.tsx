import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../../stores/uiStore';

export function ContextMenu(): React.JSX.Element | null {
  const menu = useUiStore((state) => state.contextMenu);
  const close = useUiStore((state) => state.closeContextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!menu) return;
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  }, [menu, close]);

  useLayoutEffect(() => {
    if (!menu) return;
    const width = 218;
    const height = ref.current?.offsetHeight ?? 220;
    setPosition({
      x: Math.min(menu.x, window.innerWidth - width - 8),
      y: Math.min(menu.y, window.innerHeight - height - 8)
    });
  }, [menu]);

  if (!menu) return null;
  return createPortal(
    <div className="context-menu" ref={ref} style={{ left: position.x, top: position.y }} role="menu">
      {menu.items.map((item, index) =>
        item.separator ? (
          <div className="context-sep" key={`sep-${index}`} />
        ) : (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            className={`context-item ${item.danger ? 'danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onSelect?.();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="context-shortcut">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
