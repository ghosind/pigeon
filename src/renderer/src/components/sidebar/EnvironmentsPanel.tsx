import { Check, Globe2, Layers, Plus, Settings2 } from 'lucide-react';
import { useEnvStore } from '../../stores/envStore';
import { useUiStore } from '../../stores/uiStore';
import { useTabStore } from '../../stores/tabStore';
import { useI18n } from '../../i18n';

export function EnvironmentsPanel(): React.JSX.Element {
  const environments = useEnvStore((state) => state.environments);
  const create = useEnvStore((state) => state.create);
  const openEnvironmentTab = useTabStore((state) => state.openEnvironmentTab);
  const { t } = useI18n();

  return (
    <section className="side-panel-inner environments-panel">
      <header className="panel-head">
        <span>{t('Environments')}</span>
        <div className="panel-head-actions">
          <button
            type="button"
            className="mini-btn"
            title={t('New environment')}
            aria-label={t('New environment')}
            onClick={() =>
              useUiStore.getState().openPrompt({
                title: t('New environment'),
                label: t('Environment name'),
                initialValue: t('New environment'),
                confirmLabel: t('Create'),
                onSubmit: async (name) => {
                  const environment = await create(name);
                  openEnvironmentTab(environment.id);
                }
              })
            }
          >
            <Plus size={15} />
          </button>
        </div>
      </header>
      <div className="panel-scroll env-list">
        {environments.map((environment) => (
          <button
            key={environment.id}
            type="button"
            className={`env-row ${environment.isActive ? 'active' : ''}`}
            onClick={() => openEnvironmentTab(environment.id)}
          >
            <Globe2 size={15} />
            <span>{environment.name}</span>
            {environment.isActive && <Check size={14} className="env-check" />}
          </button>
        ))}
        {environments.length === 0 && <p className="panel-note">{t('No environments yet.')}</p>}
        <button type="button" className="env-row globals-row" onClick={() => openEnvironmentTab(null)}>
          <Layers size={15} />
          <span>{t('Global variables')}</span>
        </button>
      </div>
      <footer className="panel-foot">
        <button type="button" onClick={() => openEnvironmentTab(environments.find((environment) => environment.isActive)?.id ?? null)}>
          <Settings2 size={14} /> {t('Manage environments')}
        </button>
      </footer>
    </section>
  );
}
