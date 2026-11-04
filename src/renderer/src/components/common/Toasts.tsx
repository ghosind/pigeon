import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

export function Toasts(): React.JSX.Element {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <Icon size={17} className="toast-icon" />
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.description && <span>{toast.description}</span>}
            </div>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
