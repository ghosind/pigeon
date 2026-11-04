import { useState } from 'react';
import { FileUp, ListFilter, Plus, Trash2, X } from 'lucide-react';
import type { ParamItem } from '@shared/types';
import { asApiCallError } from '../../utils/api';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';

interface KeyValueEditorProps {
  rows: ParamItem[];
  onChange: (rows: ParamItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  descriptionPlaceholder?: string;
  allowFiles?: boolean;
  enableBulkEdit?: boolean;
}

function blankRow(): ParamItem {
  return { key: '', value: '', enabled: true, description: '' };
}

function rowsToBulk(rows: ParamItem[]): string {
  return rows
    .map((row) => `${row.enabled ? '' : '// '}${row.key}: ${row.value}${row.description ? ` # ${row.description}` : ''}`)
    .join('\n');
}

function bulkToRows(text: string): ParamItem[] {
  const rows: ParamItem[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const enabled = !trimmed.startsWith('//');
    const content = enabled ? trimmed : trimmed.slice(2).trim();
    const separator = content.indexOf(':');
    if (separator < 0) {
      rows.push({ key: content, value: '', enabled, description: '' });
      continue;
    }
    const key = content.slice(0, separator).trim();
    const rest = content.slice(separator + 1).trim();
    const commentIndex = rest.indexOf(' # ');
    rows.push({
      key,
      value: commentIndex >= 0 ? rest.slice(0, commentIndex).trim() : rest,
      enabled,
      description: commentIndex >= 0 ? rest.slice(commentIndex + 3).trim() : ''
    });
  }
  return rows;
}

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  allowFiles = false,
  enableBulkEdit = false
}: KeyValueEditorProps): React.JSX.Element {
  const { t } = useI18n();
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const effective = rows.length > 0 ? rows : [blankRow()];

  const update = (index: number, patch: Partial<ParamItem>): void => {
    const next = effective.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const remove = (index: number): void => {
    onChange(effective.filter((_row, rowIndex) => rowIndex !== index));
  };

  const add = (): void => {
    onChange([...effective, blankRow()]);
  };

  const chooseFile = async (index: number): Promise<void> => {
    try {
      const path = await window.pigeon.settings.pickFile({ title: 'Choose a file to upload' });
      if (path.ok && path.data) {
        update(index, { type: 'file', filePath: path.data, value: path.data.split(/[\\/]/).pop() ?? path.data });
      } else if (!path.ok) {
        useUiStore.getState().toast('error', t('Unable to choose file'), path.error.message);
      }
    } catch (error) {
      useUiStore.getState().toast('error', t('Unable to choose file'), asApiCallError(error).message);
    }
  };

  return (
    <div className={`kv-editor ${allowFiles ? 'allow-files' : ''}`}>
      <div className="kv-toolbar">
        <span className="kv-hint">
          {enableBulkEdit ? t('Toggle rows with the checkbox. Values may contain {{variables}}.') : t('File fields are streamed from disk when the request is sent.')}
        </span>
        {enableBulkEdit && (
          <button
            type="button"
            className={`link-btn ${bulk ? 'active' : ''}`}
            onClick={() => {
              if (!bulk) setBulkText(rowsToBulk(effective));
              setBulk((value) => !value);
            }}
          >
            <ListFilter size={13} /> {t('Bulk edit')}
          </button>
        )}
      </div>

      {bulk ? (
        <div className="bulk-edit">
          <textarea
            className="bulk-textarea"
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            spellCheck={false}
            placeholder={'Content-Type: application/json\nAccept: application/json\n// Disabled-Header: value'}
          />
          <div className="bulk-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBulk(false)}>{t('Cancel')}</button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                onChange(bulkToRows(bulkText));
                setBulk(false);
              }}
            >
              {t('Apply')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="kv-head">
            <span className="kv-check" />
            <span>{keyPlaceholder}</span>
            {allowFiles && <span>{t('Type')}</span>}
            <span>{valuePlaceholder}</span>
            <span>{descriptionPlaceholder}</span>
            <span />
          </div>
          <div className="kv-body">
            {effective.map((row, index) => (
              <div className={`kv-row ${row.enabled ? '' : 'disabled'}`} key={index}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => update(index, { enabled: event.target.checked })}
                  />
                  <span className="checkbox-mark" />
                </label>
                <input
                  className="kv-input kv-key"
                  value={row.key}
                  placeholder={keyPlaceholder}
                  onChange={(event) => update(index, { key: event.target.value })}
                  spellCheck={false}
                />
                {allowFiles && (
                  <select
                    className="kv-select"
                    value={row.type ?? 'text'}
                    onChange={(event) => update(index, { type: event.target.value as 'text' | 'file' })}
                  >
                    <option value="text">{t('Text')}</option>
                    <option value="file">{t('File')}</option>
                  </select>
                )}
                {allowFiles && row.type === 'file' ? (
                  <button type="button" className="file-value" onClick={() => void chooseFile(index)}>
                    <FileUp size={13} />
                    <span>{row.filePath ? row.filePath.split(/[\\/]/).pop() : t('Choose file…')}</span>
                    {row.filePath && (
                      <span
                        className="file-clear"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          update(index, { filePath: '', value: '' });
                        }}
                        onKeyDown={(event) => event.key === 'Enter' && update(index, { filePath: '', value: '' })}
                      >
                        <X size={12} />
                      </span>
                    )}
                  </button>
                ) : (
                  <input
                    className="kv-input"
                    value={row.value}
                    placeholder={valuePlaceholder}
                    onChange={(event) => update(index, { value: event.target.value })}
                    spellCheck={false}
                  />
                )}
                <input
                  className="kv-input kv-description"
                  value={row.description ?? ''}
                  placeholder={descriptionPlaceholder}
                  onChange={(event) => update(index, { description: event.target.value })}
                />
                <button type="button" className="kv-delete" onClick={() => remove(index)} aria-label={t('Remove row')}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="kv-add" onClick={add}>
            <Plus size={13} /> {t('Add row')}
          </button>
        </>
      )}
    </div>
  );
}
