import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderTree, Save, X } from 'lucide-react';
import type { EnvironmentVariable, VariableEntry } from '@shared/types';
import { createEnvironmentVariable } from '@shared/defaults';
import { Button, IconButton } from '../common/Button';
import { CodeEditor } from '../common/CodeEditor';
import { EnvironmentVariableTable } from '../environments/EnvironmentVariableTable';
import { useCollectionStore } from '../../stores/collectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';

function toDraft(entries: VariableEntry[]): EnvironmentVariable[] {
  return entries.map((entry) => ({ ...entry, secret: false }));
}

function toEntries(variables: EnvironmentVariable[]): VariableEntry[] {
  return variables.map(({ key, value, enabled }) => ({ key, value, enabled }));
}

export function FolderSettingsPanel({ id, onClose }: { id: string; onClose: () => void }): React.JSX.Element {
  const nodes = useCollectionStore((state) => state.nodes);
  const updateNode = useCollectionStore((state) => state.updateNode);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const node = nodes.find((entry) => entry.id === id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preRequestScript, setPreRequestScript] = useState('');
  const [testScript, setTestScript] = useState('');
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<'general' | 'variables' | 'scripts'>('general');

  useEffect(() => {
    if (!node) return;
    setName(node.name);
    setDescription(node.description);
    setPreRequestScript(node.preRequestScript);
    setTestScript(node.testScript);
    setVariables(structuredClone(toDraft(node.variables)));
  }, [node]);

  useEffect(() => {
    setSection('general');
  }, [id]);

  const dirty = useMemo(() => {
    if (!node) return false;
    return (
      name !== node.name ||
      description !== node.description ||
      preRequestScript !== node.preRequestScript ||
      testScript !== node.testScript ||
      JSON.stringify(toEntries(variables)) !== JSON.stringify(node.variables)
    );
  }, [node, name, description, preRequestScript, testScript, variables]);

  if (!node) {
    return (
      <section className="folder-settings-panel">
        <header className="folder-settings-head">
          <div className="folder-settings-title">
            <Folder size={18} />
            <h1>{t('Folder settings')}</h1>
          </div>
          <IconButton label={t('Close')} onClick={onClose}><X size={16} /></IconButton>
        </header>
      </section>
    );
  }

  const isFolder = node.type === 'folder';

  const save = async (): Promise<void> => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      await updateNode(node.id, {
        name: name.trim() || node.name,
        description,
        preRequestScript,
        testScript,
        variables: toEntries(variables)
      });
      toast('success', t('Saved'));
    } catch {
      // Store surfaced the error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="folder-settings-panel">
      <header className="folder-settings-head">
        <div className="folder-settings-title">
          {isFolder ? <Folder size={18} /> : <FolderTree size={18} />}
          <div>
            <span>{t(isFolder ? 'FOLDER' : 'COLLECTION')}</span>
            <h1>{name || node.name}</h1>
          </div>
        </div>
        <div className="folder-settings-actions">
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? t('Saving…') : dirty ? t('Save changes') : t('Saved')}
          </Button>
          <IconButton label={t('Close')} onClick={onClose}><X size={16} /></IconButton>
        </div>
      </header>

      <div className="folder-settings-tabs">
        <button type="button" className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}>
          {t('General')}
        </button>
        <button type="button" className={section === 'variables' ? 'active' : ''} onClick={() => setSection('variables')}>
          {t('Variables')}
          {variables.length > 0 && <span>{variables.length}</span>}
        </button>
        <button type="button" className={section === 'scripts' ? 'active' : ''} onClick={() => setSection('scripts')}>
          {t('Scripts')}
          {Boolean(preRequestScript.trim() || testScript.trim()) && <i className="tab-dot" />}
        </button>
      </div>

      <div className="folder-settings">
        {section === 'general' && (
          <section className="folder-section">
            <h2>{t('General')}</h2>
            <label className="folder-field">
              <span>{t('Name')}</span>
              <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="folder-field">
              <span>{t('Description')}</span>
              <textarea
                className="text-input folder-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
          </section>
        )}

        {section === 'variables' && (
          <section className="folder-section">
            <h2>{t('Folder variables')}</h2>
            <p className="folder-hint">{t('Requests in this folder and its subfolders can use these variables.')}</p>
            <EnvironmentVariableTable
              variables={variables}
              revealed={new Set()}
              allowSecrets={false}
              onToggleReveal={() => undefined}
              onChange={(index, patch) =>
                setVariables((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)))
              }
              onDelete={(index) => setVariables((current) => current.filter((_entry, entryIndex) => entryIndex !== index))}
              onAdd={() => setVariables((current) => [...current, createEnvironmentVariable()])}
            />
          </section>
        )}

        {section === 'scripts' && (
          <section className="folder-section">
            <h2>{t('Scripts')}</h2>
            <label className="folder-field">
              <span>{t('Pre-request')}</span>
              <CodeEditor
                value={preRequestScript}
                onChange={setPreRequestScript}
                language="javascript"
                height={220}
                path={`folder-pre-${node.id}.js`}
              />
            </label>
            <label className="folder-field">
              <span>{t('Tests')}</span>
              <CodeEditor
                value={testScript}
                onChange={setTestScript}
                language="javascript"
                height={220}
                path={`folder-test-${node.id}.js`}
              />
            </label>
          </section>
        )}
      </div>
    </section>
  );
}
