import { RotateCcw } from 'lucide-react';
import { DEFAULT_SHORTCUTS } from '@shared/defaults';
import { Button } from '../common/Button';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatShortcut } from '../../utils/shortcuts';
import { SectionTitle } from './shared';
import { useI18n } from '../../i18n';

const SHORTCUT_ROWS = [
  ['send', 'Send request'],
  ['newTab', 'New request tab'],
  ['closeTab', 'Close active tab'],
  ['save', 'Save request'],
  ['focusUrl', 'Focus URL bar']
] as const;

export function ShortcutsSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const setPreference = useSettingsStore((state) => state.setPreference);
  const { t } = useI18n();

  return (
    <>
      <SectionTitle title={t('Keyboard shortcuts')} description={t('Use CmdOrCtrl, Shift and Alt modifiers.')} />
      <div className="shortcut-list">
        {SHORTCUT_ROWS.map(([key, label]) => (
          <div className="shortcut-row" key={key}>
            <span>{t(label)}</span>
            <input
              className="text-input mono-input shortcut-input"
              value={preference.shortcuts[key]}
              onChange={(event) =>
                setPreference({ shortcuts: { ...preference.shortcuts, [key]: event.target.value } })
              }
            />
            <kbd>{formatShortcut(preference.shortcuts[key])}</kbd>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        icon={<RotateCcw size={13} />}
        onClick={() => setPreference({ shortcuts: { ...DEFAULT_SHORTCUTS } })}
      >
        {t('Reset defaults')}
      </Button>
    </>
  );
}
