import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useI18n } from '../../i18n';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, description, children, footer, width = 480 }: ModalProps): React.JSX.Element | null {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label={t('Close')} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        {children && <div className="modal-body">{children}</div>}
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
