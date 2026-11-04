import type { WorkspaceTab } from '../../stores/tabStore';
import type { ParamItem } from '@shared/types';
import { buildUrl } from '@shared/utils/url';
import { KeyValueEditor } from './KeyValueEditor';
import { useI18n } from '../../i18n';

export function ParamsTab({
  tab,
  update
}: {
  tab: WorkspaceTab;
  update: (patch: { queryParams: ParamItem[]; url: string }) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const rows = tab.draft.queryParams;
  return (
    <div className="tab-pane params-pane">
      <div className="pane-note">
        <span>{t('Query parameters stay in sync with the URL.')}</span>
        <span className="pane-note-count">{t('{count} enabled', { count: rows.filter((row) => row.enabled && row.key).length })}</span>
      </div>
      <KeyValueEditor
        rows={rows}
        enableBulkEdit
        keyPlaceholder={t('Parameter')}
        valuePlaceholder={t('Value')}
        descriptionPlaceholder={t('Description')}
        onChange={(next) => update({ queryParams: next, url: buildUrl(tab.draft.url, next) })}
      />
    </div>
  );
}
