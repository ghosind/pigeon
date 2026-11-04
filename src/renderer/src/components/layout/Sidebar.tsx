import { Clock3, FolderTree, Layers, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';
import { CollectionsPanel } from '../sidebar/CollectionsPanel';
import { HistoryPanel } from '../sidebar/HistoryPanel';
import { EnvironmentsPanel } from '../sidebar/EnvironmentsPanel';
import { useI18n } from '../../i18n';

const PANELS = [
  { id: 'collections' as const, label: 'Collections', icon: FolderTree },
  { id: 'history' as const, label: 'History', icon: Clock3 },
  { id: 'environments' as const, label: 'Environments', icon: Layers }
];

export function Sidebar(): React.JSX.Element {
  const panel = useUiStore((state) => state.sidePanel);
  const open = useUiStore((state) => state.panelOpen);
  const togglePanel = useUiStore((state) => state.togglePanel);
  const width = useUiStore((state) => state.panelWidth);
  const setWidth = useUiStore((state) => state.setPanelWidth);
  const navigate = useNavigate();
  const { t } = useI18n();

  const beginResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = (moveEvent: PointerEvent): void => setWidth(startWidth + moveEvent.clientX - startX);
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="sidebar-shell">
      <nav className="rail" aria-label={t('Workspace panels')}>
        <div className="rail-group">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`rail-btn ${panel === id && open ? 'active' : ''}`}
              onClick={() => togglePanel(id)}
              title={t(label)}
              aria-label={t(label)}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span className="rail-tip">{t(label)}</span>
            </button>
          ))}
        </div>
        <div className="rail-group rail-bottom">
          <button type="button" className="rail-btn" onClick={() => navigate('/settings')} title={t('Settings')} aria-label={t('Settings')}>
            <Settings2 size={18} strokeWidth={1.8} />
          </button>
        </div>
      </nav>

      {open && (
        <aside className="side-panel" style={{ width }}>
          {panel === 'collections' && <CollectionsPanel />}
          {panel === 'history' && <HistoryPanel />}
          {panel === 'environments' && <EnvironmentsPanel />}
          <div className="panel-resizer" onPointerDown={beginResize} role="separator" aria-orientation="vertical" />
        </aside>
      )}
    </div>
  );
}
