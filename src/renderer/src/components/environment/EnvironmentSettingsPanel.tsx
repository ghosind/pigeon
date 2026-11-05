import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Globe2, Layers, Save, Trash2, X } from 'lucide-react';
import type { EnvironmentVariable } from '@shared/types';
import { createEnvironmentVariable } from '@shared/defaults';
import { Button, IconButton } from '../common/Button';
import { EnvironmentVariableTable } from '../environments/EnvironmentVariableTable';
import { useEnvStore } from '../../stores/envStore';
import { useTabStore } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { asApiCallError } from '../../utils/api';
import { useI18n } from '../../i18n';

export function EnvironmentSettingsPanel({
  environmentId,
  onClose
}: {
  environmentId: string | null;
  onClose: () => void;
}): React.JSX.Element {
  const environments = useEnvStore((state) => state.environments);
  const globals = useEnvStore((state) => state.globals);
  const update = useEnvStore((state) => state.update);
  const create = useEnvStore((state) => state.create);
  const remove = useEnvStore((state) => state.remove);
  const activate = useEnvStore((state) => state.activate);
  const reveal = useEnvStore((state) => state.reveal);
  const saveGlobals = useEnvStore((state) => state.saveGlobals);
  const openEnvironmentTab = useTabStore((state) => state.openEnvironmentTab);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const environment = environmentId ? environments.find((entry) => entry.id === environmentId) : undefined;
  const isGlobals = environmentId === null;
  const [name, setName] = useState('');
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const sourceVariables = isGlobals ? globals : environment?.variables ?? [];

  useEffect(() => {
    setName(isGlobals ? t('Global variables') : environment?.name ?? '');
    setVariables(structuredClone(sourceVariables));
    setRevealed(new Set());
  }, [environment, isGlobals, sourceVariables, t]);

  const sourceName = isGlobals ? t('Global variables') : environment?.name ?? '';
  const dirty = useMemo(
    () => name !== sourceName || JSON.stringify(variables) !== JSON.stringify(sourceVariables),
    [name, variables, sourceName, sourceVariables]
  );

  const save = async (): Promise<void> => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      if (isGlobals) await saveGlobals(variables);
      else if (environment) await update(environment.id, { name: name.trim() || environment.name, variables });
      setRevealed(new Set());
    } catch {
      // Store surfaced the error.
    } finally {
      setSaving(false);
    }
  };

  const toggleReveal = (variable: EnvironmentVariable): void => {
    if (revealed.has(variable.key)) {
      setVariables((current) =>
        current.map((entry) => (entry.key === variable.key ? { ...entry, value: '', hasValue: true } : entry))
      );
      setRevealed((current) => {
        const next = new Set(current);
        next.delete(variable.key);
        return next;
      });
      return;
    }
    void (async () => {
      try {
        const value = await reveal(isGlobals ? null : environmentId, variable.key);
        setVariables((current) =>
          current.map((entry) => (entry.key === variable.key ? { ...entry, value, hasValue: true } : entry))
        );
        setRevealed((current) => new Set(current).add(variable.key));
      } catch {
        // Store surfaced the error.
      }
    })();
  };

  const duplicate = async (): Promise<void> => {
    if (!environment) return;
    try {
      const copied = await Promise.all(
        environment.variables.map(async (variable) => {
          if (!variable.secret || !variable.hasValue) return variable;
          const value = await reveal(environment.id, variable.key);
          return { ...variable, value, hasValue: true };
        })
      );
      const created = await create(`${environment.name} copy`);
      await update(created.id, { variables: copied });
      openEnvironmentTab(created.id);
    } catch (error) {
      toast('error', t('Unable to duplicate environment'), asApiCallError(error).message);
    }
  };

  const removeEnvironment = (): void => {
    if (!environment) return;
    useUiStore.getState().openConfirm({
      title: t('Delete environment'),
      message: t('Delete “{name}” and its variables? This cannot be undone.', { name: environment.name }),
      confirmLabel: t('Delete'),
      danger: true,
      onConfirm: async () => {
        await remove(environment.id);
        onClose();
      }
    });
  };

  const eyebrow = isGlobals ? t('GLOBAL SCOPE') : t('ENVIRONMENT');

  return (
    <section className="environment-settings-panel">
      <header className="folder-settings-head">
        <div className="folder-settings-title">
          {isGlobals ? <Layers size={18} /> : <Globe2 size={18} />}
          <div>
            <span>{eyebrow}</span>
            <h1>{isGlobals ? t('Global variables') : name || environment?.name}</h1>
          </div>
        </div>
        <div className="folder-settings-actions">
          {environment && !environment.isActive && (
            <Button size="sm" variant="secondary" icon={<Check size={13} />} onClick={() => void activate(environment.id)}>
              {t('Set active')}
            </Button>
          )}
          {environment && (
            <>
              <Button size="sm" variant="ghost" icon={<Copy size={13} />} onClick={() => void duplicate()}>
                {t('Duplicate')}
              </Button>
              <IconButton label={t('Delete environment')} variant="danger" onClick={removeEnvironment}>
                <Trash2 size={15} />
              </IconButton>
            </>
          )}
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? t('Saving…') : dirty ? t('Save changes') : t('Saved')}
          </Button>
          <IconButton label={t('Close')} onClick={onClose}><X size={16} /></IconButton>
        </div>
      </header>

      <div className="environment-settings-body">
        <div className="environment-name-row">
          <label>
            <span>{t('Name')}</span>
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isGlobals}
            />
          </label>
          {environment?.isActive && <span className="env-active-badge"><Check size={12} /> {t('Active')}</span>}
        </div>

        <EnvironmentVariableTable
          variables={variables}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          onChange={(index, patch) =>
            setVariables((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)))
          }
          onDelete={(index) => setVariables((current) => current.filter((_entry, entryIndex) => entryIndex !== index))}
          onAdd={() => setVariables((current) => [...current, createEnvironmentVariable()])}
        />

        <div className="env-footnote">
          <span>{t('Scope priority')}</span>
          <code>{t('local')}</code> <i>›</i> <code>{t('environment')}</code> <i>›</i> <code>{t('folder')}</code> <i>›</i> <code>{t('global')}</code>
          <span className="env-footnote-note">{t('Unresolved placeholders are left untouched and reported by the request engine.')}</span>
        </div>
      </div>
    </section>
  );
}
