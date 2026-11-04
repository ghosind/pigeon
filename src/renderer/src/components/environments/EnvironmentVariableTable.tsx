import { Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { EnvironmentVariable } from '@shared/types';
import { Switch } from '../common/Switch';
import { useI18n } from '../../i18n';

interface Props {
  variables: EnvironmentVariable[];
  revealed: Set<string>;
  onToggleReveal: (variable: EnvironmentVariable) => void;
  onChange: (index: number, patch: Partial<EnvironmentVariable>) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

export function EnvironmentVariableTable({
  variables,
  revealed,
  onToggleReveal,
  onChange,
  onDelete,
  onAdd
}: Props): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="env-table">
      <div className="env-table-head">
        <span>{t('On')}</span>
        <span>{t('Variable')}</span>
        <span>{t('Value')}</span>
        <span>{t('Secret')}</span>
        <span />
      </div>
      {variables.length === 0 && (
        <div className="env-empty">
          <KeyRound size={24} />
          <h4>{t('No variables yet')}</h4>
          <p>{t('Add a base URL, token or any value you want to reuse across requests.')}</p>
        </div>
      )}
      {variables.map((variable, index) => {
        const isRevealed = revealed.has(variable.key);
        const mask = variable.secret && variable.hasValue && !isRevealed;
        const showValue = !variable.secret || isRevealed || !variable.hasValue;
        return (
          <div className={`env-row-edit ${variable.enabled ? '' : 'disabled'}`} key={`${variable.key}-${index}`}>
            <div className="env-checkbox">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={variable.enabled}
                  onChange={(event) => onChange(index, { enabled: event.target.checked })}
                />
                <span className="checkbox-mark" />
              </label>
            </div>
            <input
              className="kv-input mono-input"
              value={variable.key}
              placeholder={t('VARIABLE_NAME')}
              onChange={(event) => onChange(index, { key: event.target.value })}
              spellCheck={false}
            />
            <div className="env-value-wrap">
              <input
                className="kv-input mono-input"
                type={variable.secret && !isRevealed && variable.hasValue ? 'password' : 'text'}
                value={showValue ? variable.value : ''}
                placeholder={mask ? t('•••••••• stored secret') : t('Value')}
                onChange={(event) => onChange(index, { value: event.target.value, hasValue: event.target.value.length > 0 })}
                spellCheck={false}
                autoComplete="off"
              />
              {variable.secret && (
                <button
                  type="button"
                  className="reveal-btn"
                  onClick={() => onToggleReveal(variable)}
                  title={isRevealed ? t('Hide secret') : t('Reveal secret')}
                >
                  {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
            <div className="env-secret-toggle">
              <Switch
                label={`Mark ${variable.key || 'variable'} secret`}
                checked={variable.secret}
                onChange={(secret) => onChange(index, { secret })}
              />
            </div>
            <button type="button" className="kv-delete" onClick={() => onDelete(index)} aria-label={t('Delete variable')}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button type="button" className="env-add-row" onClick={onAdd}>
        <Plus size={14} /> {t('Add variable')}
      </button>
    </div>
  );
}
