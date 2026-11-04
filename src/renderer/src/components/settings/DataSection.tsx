import { Download, FolderOpen, Upload } from 'lucide-react';
import { Button } from '../common/Button';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useEnvStore } from '../../stores/envStore';
import { useHistoryStore } from '../../stores/historyStore';
import { asApiCallError, unwrap } from '../../utils/api';
import { FieldGroup, SectionTitle } from './shared';
import { useI18n } from '../../i18n';

export function DataSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const info = useSettingsStore((state) => state.info);
  const load = useSettingsStore((state) => state.load);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();

  const changeDataDir = async (): Promise<void> => {
    const picked = await window.pigeon.settings.pickDirectory();
    if (!picked.ok || !picked.data) return;
    useUiStore.getState().openConfirm({
      title: t('Move data folder'),
      message: t('Pigeon will copy the local database and vault key to the new folder and restart. External certificate files are referenced by path and are not copied.'),
      confirmLabel: t('Move and restart'),
      danger: true,
      onConfirm: async () => {
        const result = await window.pigeon.settings.changeDataDir(picked.data!);
        if (!result.ok) toast('error', t('Unable to move data'), result.error.message);
        else toast('info', t('Restarting Pigeon…'), t('The app will reopen with the new data folder.'));
      }
    });
  };

  const exportBackup = async (): Promise<void> => {
    try {
      const result = await unwrap(window.pigeon.transfer.exportBackup());
      if (result) toast('success', t('Backup exported'), result.path);
    } catch (error) {
      toast('error', t('Export failed'), asApiCallError(error).message);
    }
  };

  const restoreBackup = async (): Promise<void> => {
    try {
      const result = await unwrap(window.pigeon.transfer.importBackup());
      if (!result) return;
      await Promise.all([
        load(),
        useCollectionStore.getState().load(),
        useEnvStore.getState().load(),
        useHistoryStore.getState().load(true)
      ]);
      toast('success', t('Backup restored'), t('{count} collections restored', { count: result.summary.collections }));
    } catch (error) {
      toast('error', t('Restore failed'), asApiCallError(error).message);
    }
  };

  return (
    <>
      <SectionTitle title={t('Data & backups')} description={t('Everything lives in a local database and an encrypted vault key.')} />
      <FieldGroup label={t('Data folder')}>
        <div className="data-path"><FolderOpen size={16} /><code>{preference.dataDir}</code></div>
        <div className="button-row">
          <Button size="sm" variant="secondary" onClick={() => void changeDataDir()} disabled={Boolean(info?.portable)}>
            {t('Change folder…')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void window.pigeon.app.showItemInFolder(preference.dataDir)}>
            {t('Show in folder')}
          </Button>
        </div>
        {info?.portable && <p className="form-hint">{t('Data folder is fixed in portable mode.')}</p>}
      </FieldGroup>
      <FieldGroup label={t('Backup')}>
        <p className="form-hint" style={{ marginTop: 0 }}>
          {t('Backups are scoped to the current workspace and include collections, requests, environments, preferences and encrypted secrets. Restoring on another machine will not decrypt existing secrets.')}
        </p>
        <div className="button-row">
          <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => void exportBackup()}>{t('Export backup')}</Button>
          <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => void restoreBackup()}>{t('Restore backup')}</Button>
        </div>
      </FieldGroup>
      <FieldGroup label={t('Storage')}>
        <dl className="info-list">
          <div><dt>{t('Database')}</dt><dd>{t('Local file')}</dd></div>
          <div><dt>{t('Secrets')}</dt><dd>AES-256-GCM</dd></div>
          <div><dt>{t('Telemetry')}</dt><dd>{t('None')}</dd></div>
        </dl>
      </FieldGroup>
    </>
  );
}
