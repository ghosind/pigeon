import { useNavigate } from 'react-router-dom';
import {
  Download,
  FileJson,
  FolderUp,
  Globe2,
  Keyboard,
  Search,
  Settings2,
  Upload
} from 'lucide-react';
import { useEnvStore } from '../../stores/envStore';
import { useTabStore } from '../../stores/tabStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { asApiCallError, unwrap } from '../../utils/api';
import { formatShortcut } from '../../utils/shortcuts';
import { Logo } from '../common/Logo';
import { IconButton } from '../common/Button';
import { Menu, type MenuAction } from '../common/Menu';
import { useI18n } from '../../i18n';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function TopBar(): React.JSX.Element {
  const navigate = useNavigate();
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const toast = useUiStore((state) => state.toast);
  const loadSettings = useSettingsStore((state) => state.load);
  const { t } = useI18n();

  const reloadWorkspace = async (): Promise<void> => {
    await Promise.all([
      useCollectionStore.getState().load(),
      useEnvStore.getState().load(),
      useHistoryStore.getState().load(true)
    ]);
  };

  const runImport = async (
    kind: 'postman' | 'har' | 'environment' | 'backup'
  ): Promise<void> => {
    try {
      if (kind === 'environment') {
        const result = await unwrap(window.pigeon.transfer.importEnvironment());
        if (!result) return;
        await useEnvStore.getState().load();
        toast('success', t('Environment imported'), t('{count} added', { count: result.environments }));
        return;
      }
      const result = await unwrap(
        kind === 'postman' ? window.pigeon.transfer.importPostman()
        : kind === 'har' ? window.pigeon.transfer.importHar()
        : window.pigeon.transfer.importBackup()
      );
      if (!result) return;
      await reloadWorkspace();
      if (kind === 'backup') await loadSettings();
      const summary = result.summary;
      const total = summary.collections + summary.folders + summary.requests + summary.environments;
      toast('success', t('Import complete'), t('{count} added · {warnings} warning(s)', { count: total, warnings: summary.warnings.length }));
      if (result.importedCollectionIds.length) {
        const snapshot = await unwrap(window.pigeon.collections.snapshot());
        const first = result.importedCollectionIds
          .flatMap((id) => snapshot.requests.filter((request) => request.collectionId === id))
          .at(0);
        if (first) useTabStore.getState().openRequest(first);
      }
    } catch (error) {
      toast('error', t('Import failed'), asApiCallError(error).message);
    }
  };

  const runExport = async (kind: 'postman' | 'har' | 'backup'): Promise<void> => {
    try {
      const call =
        kind === 'postman' ? window.pigeon.transfer.exportPostman({})
        : kind === 'har' ? window.pigeon.transfer.exportHar({})
        : window.pigeon.transfer.exportBackup();
      const result = await unwrap(call);
      if (!result) return;
      toast('success', t('Export complete'), result.path);
    } catch (error) {
      toast('error', t('Export failed'), asApiCallError(error).message);
    }
  };

  const importItems: MenuAction[] = [
    { label: t('Postman collection (v2.1)'), icon: <FileJson size={15} />, onSelect: () => void runImport('postman') },
    { label: t('Postman environment'), icon: <Globe2 size={15} />, onSelect: () => void runImport('environment') },
    { label: t('HAR archive'), icon: <Upload size={15} />, onSelect: () => void runImport('har') },
    { separator: true },
    { label: t('Restore Pigeon backup…'), icon: <FolderUp size={15} />, onSelect: () => void runImport('backup') }
  ];

  const exportItems: MenuAction[] = [
    { label: t('Export all as Postman v2.1'), icon: <FileJson size={15} />, onSelect: () => void runExport('postman') },
    { label: t('Export all as HAR'), icon: <Download size={15} />, onSelect: () => void runExport('har') },
    { separator: true },
    { label: t('Export Pigeon backup…'), icon: <Download size={15} />, onSelect: () => void runExport('backup') }
  ];

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => navigate('/')} aria-label="Pigeon home">
        <Logo size={28} />
        <span className="brand-word">Pigeon</span>
        <span className="brand-tag">API STUDIO</span>
      </button>

      <button type="button" className="command-trigger" onClick={() => setCommandOpen(true)}>
        <Search size={15} />
        <span>{t('Search or jump to…')}</span>
        <kbd>{formatShortcut('CmdOrCtrl+K')}</kbd>
      </button>

      <div className="topbar-spacer" />

      <WorkspaceSwitcher />

      <Menu
        trigger={
          <IconButton label={t('Import')}>
            <Upload size={16} />
          </IconButton>
        }
        items={importItems}
        width={248}
      />

      <Menu
        trigger={
          <IconButton label={t('Export')}>
            <Download size={16} />
          </IconButton>
        }
        items={exportItems}
        width={250}
      />

      <IconButton label={t('Command palette')} onClick={() => setCommandOpen(true)}>
        <Keyboard size={16} />
      </IconButton>

      <IconButton label={t('Settings')} onClick={() => navigate('/settings')}>
        <Settings2 size={17} />
      </IconButton>

    </header>
  );
}
