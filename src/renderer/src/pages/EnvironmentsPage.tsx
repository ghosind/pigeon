import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Globe2,
  Layers,
  Lock,
  Plus,
  Save,
  Trash2
} from 'lucide-react';
import type { EnvironmentVariable } from '@shared/types';
import { createEnvironmentVariable } from '@shared/defaults';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, IconButton } from '../components/common/Button';
import { EnvironmentVariableTable } from '../components/environments/EnvironmentVariableTable';
import { useEnvStore } from '../stores/envStore';
import { useUiStore } from '../stores/uiStore';
import { asApiCallError } from '../utils/api';
import { useI18n } from '../i18n';

const GLOBALS = 'globals';

export function EnvironmentsPage(): React.JSX.Element {
  const environments = useEnvStore((state) => state.environments);
  const globals = useEnvStore((state) => state.globals);
  const create = useEnvStore((state) => state.create);
  const update = useEnvStore((state) => state.update);
  const remove = useEnvStore((state) => state.remove);
  const activate = useEnvStore((state) => state.activate);
  const reveal = useEnvStore((state) => state.reveal);
  const saveGlobals = useEnvStore((state) => state.saveGlobals);
  const toast = useUiStore((state) => state.toast);
  const [selectedId, setSelectedId] = useState<string>(GLOBALS);
  const chosenRef = useRef(false);
  const [name, setName] = useState('Global variables');
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  const selected = environments.find((environment) => environment.id === selectedId);
  const isGlobals = selectedId === GLOBALS;
  const sourceVariables = isGlobals ? globals : selected?.variables ?? [];
  const dirty = useMemo(() => {
    const sourceName = isGlobals ? 'Global variables' : selected?.name ?? '';
    return name !== sourceName || JSON.stringify(variables) !== JSON.stringify(sourceVariables);
  }, [name, variables, sourceVariables, isGlobals, selected]);

  useEffect(() => {
    if (chosenRef.current) return;
    const active = environments.find((environment) => environment.isActive);
    setSelectedId(active?.id ?? environments[0]?.id ?? GLOBALS);
  }, [environments]);

  useEffect(() => {
    if (isGlobals) {
      setName('Global variables');
      setVariables(structuredClone(globals));
    } else if (selected) {
      setName(selected.name);
      setVariables(structuredClone(selected.variables));
    }
    setRevealed(new Set());
  }, [selectedId, selected, globals, isGlobals]);

  const select = (id: string): void => {
    chosenRef.current = true;
    setSelectedId(id);
  };

  const addEnvironment = (): void => {
    useUiStore.getState().openPrompt({
      title: t('New environment'),
      label: t('Environment name'),
      initialValue: t('New environment'),
      confirmLabel: t('Create'),
      onSubmit: async (value) => {
        try {
          const environment = await create(value);
          chosenRef.current = true;
          setSelectedId(environment.id);
        } catch {
          // Store surfaced the error.
        }
      }
    });
  };

  const deleteEnvironment = (): void => {
    if (!selected) return;
    useUiStore.getState().openConfirm({
      title: t('Delete environment'),
      message: t('Delete “{name}” and its variables? This cannot be undone.', { name: selected.name }),
      confirmLabel: t('Delete'),
      danger: true,
      onConfirm: async () => {
        await remove(selected.id);
        chosenRef.current = true;
        setSelectedId(environments.find((environment) => environment.id !== selected.id)?.id ?? GLOBALS);
      }
    });
  };

  const duplicateEnvironment = async (): Promise<void> => {
    if (!selected) return;
    try {
      const copied = await Promise.all(
        selected.variables.map(async (variable) => {
          if (!variable.secret || !variable.hasValue) return variable;
          const value = await reveal(selected.id, variable.key);
          return { ...variable, value, hasValue: true };
        })
      );
      const environment = await create(`${selected.name} copy`);
      await update(environment.id, { variables: copied });
      chosenRef.current = true;
      setSelectedId(environment.id);
    } catch (error) {
      toast('error', t('Unable to duplicate environment'), asApiCallError(error).message);
    }
  };

  const doReveal = async (variable: EnvironmentVariable): Promise<void> => {
    try {
      const value = await reveal(isGlobals ? null : selectedId, variable.key);
      setVariables((current) =>
        current.map((entry) => (entry.key === variable.key ? { ...entry, value, hasValue: true } : entry))
      );
      setRevealed((current) => new Set(current).add(variable.key));
    } catch {
      // Store surfaced the error.
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
    void doReveal(variable);
  };

  const updateVariable = (index: number, patch: Partial<EnvironmentVariable>): void => {
    setVariables((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  const saveAll = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    try {
      if (isGlobals) {
        await saveGlobals(variables);
      } else if (selected) {
        await update(selected.id, { name: name.trim() || selected.name, variables });
      }
      setRevealed(new Set());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title={t('Environments')}
        eyebrow={t('VARIABLES')}
        description={t('Swap base URLs and credentials without editing every request. Secret values are encrypted at rest.')}
        actions={
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => void saveAll()} disabled={saving || !dirty}>
            {saving ? t('Saving…') : dirty ? t('Save changes') : t('Saved')}
          </Button>
        }
      />
      <div className="env-layout">
        <aside className="env-sidebar">
          <div className="env-sidebar-head">
            <span>{t('Environments')}</span>
            <button type="button" className="mini-btn" onClick={addEnvironment} title={t('New environment')} aria-label={t('New environment')}>
              <Plus size={15} />
            </button>
          </div>
          <div className="env-list-page">
            {environments.map((environment) => (
              <button
                key={environment.id}
                type="button"
                className={`env-list-item ${selectedId === environment.id ? 'active' : ''}`}
                onClick={() => select(environment.id)}
              >
                <Globe2 size={15} />
                <span>
                  <strong>{environment.name}</strong>
                  <small>{t('{count} variables', { count: environment.variables.length })}</small>
                </span>
                {environment.isActive && <span className="active-pill">{t('ACTIVE')}</span>}
              </button>
            ))}
            <button
              type="button"
              className={`env-list-item globals ${selectedId === GLOBALS ? 'active' : ''}`}
              onClick={() => select(GLOBALS)}
            >
              <Layers size={15} />
              <span>
                <strong>{t('Global variables')}</strong>
                <small>{t('{count} variables', { count: globals.length })}</small>
              </span>
            </button>
          </div>
          <div className="env-sidebar-note">
            <Lock size={13} />
            <span>{t('Secret values use AES-256-GCM and never appear in logs.')}</span>
          </div>
        </aside>

        <main className="env-main">
          <div className="env-main-head">
            <div className="env-title-block">
              <span className="env-eyebrow">{isGlobals ? t('GLOBAL SCOPE') : t('ENVIRONMENT')}</span>
              <input
                className="env-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isGlobals}
                aria-label={t('Environment name')}
              />
              <div className="env-meta">
                {selected?.isActive && <span className="env-active-badge"><Check size={12} /> {t('Active')}</span>}
                <span>{t('{count} variables · {secrets} secret', { count: variables.length, secrets: variables.filter((variable) => variable.secret).length })}</span>
              </div>
            </div>
            <div className="env-actions">
              {!isGlobals && selected && !selected.isActive && (
                <Button size="sm" variant="secondary" onClick={() => void activate(selected.id)}>{t('Set active')}</Button>
              )}
              {!isGlobals && selected && (
                <>
                  <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => void duplicateEnvironment()}>{t('Duplicate')}</Button>
                  <IconButton label={t('Delete environment')} variant="danger" onClick={deleteEnvironment}>
                    <Trash2 size={15} />
                  </IconButton>
                </>
              )}
            </div>
          </div>

          <EnvironmentVariableTable
            variables={variables}
            revealed={revealed}
            onToggleReveal={toggleReveal}
            onChange={updateVariable}
            onDelete={(index) => setVariables((current) => current.filter((_entry, entryIndex) => entryIndex !== index))}
            onAdd={() => setVariables((current) => [...current, createEnvironmentVariable()])}
          />

          <div className="env-footnote">
            <span>{t('Scope priority')}</span>
            <code>{t('local')}</code> <i>›</i> <code>{t('environment')}</code> <i>›</i> <code>{t('global')}</code>
            <span className="env-footnote-note">{t('Unresolved placeholders are left untouched and reported by the request engine.')}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
