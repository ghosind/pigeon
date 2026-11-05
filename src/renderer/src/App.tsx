import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { WorkspacePage } from './pages/WorkspacePage';
import { SettingsPage } from './pages/SettingsPage';
import { Toasts } from './components/common/Toasts';
import { ContextMenu } from './components/common/ContextMenu';
import { DialogHost } from './components/common/DialogHost';
import { CommandPalette } from './components/common/CommandPalette';
import { SaveRequestModal } from './components/common/SaveRequestModal';
import { Logo } from './components/common/Logo';
import { useSettingsStore, installThemeWatcher } from './stores/settingsStore';
import { useCollectionStore } from './stores/collectionStore';
import { useEnvStore } from './stores/envStore';
import { useHistoryStore } from './stores/historyStore';
import { useI18n } from './i18n';
import { setVariableSupplier } from './utils/monaco';
import { buildVariableCatalog, folderVariableEntries } from './utils/variableCatalog';
import { useTabStore } from './stores/tabStore';
import { useWorkspaceStore } from './stores/workspaceStore';

export default function App(): React.JSX.Element {
  const loaded = useSettingsStore((state) => state.loaded);
  const loadSettings = useSettingsStore((state) => state.load);
  const { t } = useI18n();

  useEffect(() => {
    setVariableSupplier(() => {
      const environmentState = useEnvStore.getState();
      const tabState = useTabStore.getState();
      const activeTab = tabState.tabs.find((tab) => tab.id === tabState.activeTabId);
      const folderVariables = folderVariableEntries(activeTab?.collectionId, useCollectionStore.getState().nodes);
      return buildVariableCatalog(environmentState.environments, environmentState.globals, folderVariables);
    });
  }, []);

  useEffect(() => {
    const dispose = installThemeWatcher();
    return dispose;
  }, []);

  useEffect(() => {
    const boot = async (): Promise<void> => {
      await loadSettings();
      await useWorkspaceStore.getState().load();
      await Promise.all([
        useCollectionStore.getState().load(),
        useEnvStore.getState().load(),
        useHistoryStore.getState().load(true)
      ]);
    };
    void boot();
  }, [loadSettings]);

  if (!loaded) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">
          <Logo size={46} />
        </div>
        <div className="boot-word">Pigeon</div>
        <div className="boot-line" />
        <p className="boot-sub">{t('Local-first API studio')}</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<WorkspacePage />} />
      </Routes>
      <Toasts />
      <ContextMenu />
      <DialogHost />
      <CommandPalette />
      <SaveRequestModal />
    </>
  );
}
