import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useTabStore } from '../../stores/tabStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { flattenContainers } from '../../utils/tree';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18n } from '../../i18n';

export function SaveRequestModal(): React.JSX.Element {
  const tabId = useUiStore((state) => state.saveRequestTabId);
  const close = useUiStore((state) => state.closeSaveRequest);
  const tab = useTabStore((state) => state.tabs.find((entry) => entry.id === tabId));
  const nodes = useCollectionStore((state) => state.nodes);
  const saveToCollection = useTabStore((state) => state.saveToCollection);
  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const containers = useMemo(() => flattenContainers(nodes), [nodes]);

  useEffect(() => {
    if (!tab) return;
    setName(tab.draft.name);
    setCollectionId(tab.collectionId ?? containers[0]?.id ?? '');
  }, [tabId]);

  if (!tab) return <></>;

  const submit = async (): Promise<void> => {
    if (!collectionId || !name.trim() || busy) return;
    setBusy(true);
    const saved = await saveToCollection(tab.id, collectionId, name.trim());
    setBusy(false);
    if (saved) close();
  };

  return (
    <Modal
      open={Boolean(tabId)}
      onClose={close}
      title={t('Save request')}
      description={t('Store this request in a collection so it is available next time.')}
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!collectionId || !name.trim() || busy}>
            {busy ? t('Saving…') : t('Save request')}
          </Button>
        </>
      }
    >
      <label className="field-label" htmlFor="save-request-name">{t('Request name')}</label>
      <input
        id="save-request-name"
        className="text-input"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && void submit()}
      />
      <label className="field-label" htmlFor="save-request-collection" style={{ marginTop: 16 }}>{t('Collection')}</label>
      {containers.length === 0 ? (
        <p className="form-hint warning">{t('Create a collection first, then save this request.')}</p>
      ) : (
        <select
          id="save-request-collection"
          className="select-input"
          value={collectionId}
          onChange={(event) => setCollectionId(event.target.value)}
        >
          {containers.map((container) => (
            <option key={container.id} value={container.id}>
              {'  '.repeat(container.depth)}{container.name}
            </option>
          ))}
        </select>
      )}
    </Modal>
  );
}
