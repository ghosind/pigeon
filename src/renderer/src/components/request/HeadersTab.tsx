import { Sparkles } from 'lucide-react';
import type { ParamItem } from '@shared/types';
import type { WorkspaceTab } from '../../stores/tabStore';
import { Menu } from '../common/Menu';
import { KeyValueEditor } from './KeyValueEditor';
import { useI18n } from '../../i18n';

const PRESETS: Array<{ label: string; headers: Array<[string, string]> }> = [
  { label: 'JSON request', headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']] },
  { label: 'XML request', headers: [['Content-Type', 'application/xml'], ['Accept', 'application/xml']] },
  { label: 'No cache', headers: [['Cache-Control', 'no-cache']] },
  { label: 'Browser-like', headers: [['User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'], ['Accept', '*/*']] }
];

export function HeadersTab({
  tab,
  update
}: {
  tab: WorkspaceTab;
  update: (patch: { headers: ParamItem[] }) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const applyPreset = (headers: Array<[string, string]>): void => {
    const next = structuredClone(tab.draft.headers);
    for (const [key, value] of headers) {
      const existing = next.find((header) => header.key.toLowerCase() === key.toLowerCase());
      if (existing) {
        existing.value = value;
        existing.enabled = true;
      } else {
        next.push({ key, value, enabled: true, description: '' });
      }
    }
    update({ headers: next });
  };

  return (
    <div className="tab-pane headers-pane">
      <div className="pane-toolbar">
        <Menu
          width={200}
          trigger={
            <button type="button" className="btn btn-secondary btn-sm">
              <Sparkles size={13} /> {t('Presets')}
            </button>
          }
          items={PRESETS.map((preset) => ({
            label: t(preset.label),
            onSelect: () => applyPreset(preset.headers)
          }))}
        />
      </div>
      <KeyValueEditor
        rows={tab.draft.headers}
        enableBulkEdit
        keyPlaceholder={t('Header')}
        valuePlaceholder={t('Value')}
        descriptionPlaceholder={t('Description')}
        onChange={(headers) => update({ headers })}
      />
    </div>
  );
}
