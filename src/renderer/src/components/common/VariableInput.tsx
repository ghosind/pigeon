import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useVariableCatalog } from '../../hooks/useVariableCatalog';
import { variableMap, type VariableInfo } from '../../utils/variableCatalog';
import { useI18n } from '../../i18n';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  fieldClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
  spellCheck?: boolean;
  autoComplete?: string;
  autoCapitalize?: string;
  autoCorrect?: string;
  dataUrlInput?: boolean;
}

interface PopoverPosition {
  left: number;
  top: number;
  width: number;
}

interface HoverState {
  name: string;
  left: number;
  top: number;
}

const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

function inside(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function VariableInput({
  value,
  onChange,
  onKeyDown,
  className = '',
  fieldClassName = '',
  placeholder,
  ariaLabel,
  spellCheck = false,
  autoComplete = 'off',
  autoCapitalize = 'off',
  autoCorrect = 'off',
  dataUrlInput = false
}: VariableInputProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const catalog = useVariableCatalog();
  const infoByName = variableMap(catalog);
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<VariableInfo[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popover, setPopover] = useState<PopoverPosition | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const scopeLabel = (scope: VariableInfo['scope']): string => {
    if (scope === 'environment') return t('Environment');
    if (scope === 'folder') return t('Folder');
    if (scope === 'global') return t('Global scope');
    return t('Dynamic variable');
  };

  const openSuggestions = (text: string, caret: number): void => {
    const before = text.slice(0, caret);
    const open = before.lastIndexOf('{{');
    if (open < 0 || before.lastIndexOf('}}') > open) {
      setSuggestions(null);
      return;
    }
    const query = before.slice(open + 2).trim();
    if (/[{}]/.test(query)) {
      setSuggestions(null);
      return;
    }
    const matches = catalog
      .filter((variable) => variable.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
    if (matches.length === 0) {
      setSuggestions(null);
      return;
    }
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 240);
    setSuggestions(matches);
    setActiveIndex(0);
    setPopover({
      left: Math.min(rect.left, window.innerWidth - width - 8),
      top: Math.min(rect.bottom + 4, window.innerHeight - 224),
      width
    });
  };

  const closeSuggestions = (): void => {
    setSuggestions(null);
    setPopover(null);
  };

  const insert = (name: string): void => {
    const input = inputRef.current;
    const caret = input?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const open = before.lastIndexOf('{{');
    if (open < 0) return;
    const suffix = value.slice(caret).replace(/^\}\}/, '');
    const next = `${value.slice(0, open)}{{${name}}}${suffix}`;
    onChange(next);
    closeSuggestions();
    const position = open + name.length + 4;
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(position, position);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.value;
    onChange(next);
    openSuggestions(next, event.target.selectionStart ?? next.length);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (suggestions && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const target = suggestions[activeIndex];
        if (target) {
          event.preventDefault();
          insert(target.name);
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSuggestions();
        return;
      }
    }
    onKeyDown?.(event);
  };

  const segments = (() => {
    const result: Array<{ text: string; name: string; info?: VariableInfo }> = [];
    let last = 0;
    TOKEN_PATTERN.lastIndex = 0;
    for (let match = TOKEN_PATTERN.exec(value); match; match = TOKEN_PATTERN.exec(value)) {
      if (match.index > last) result.push({ text: value.slice(last, match.index), name: '' });
      const name = (match[1] ?? '').trim();
      result.push({ text: match[0], name, info: infoByName.get(name) });
      last = match.index + match[0].length;
    }
    if (last < value.length) result.push({ text: value.slice(last), name: '' });
    return result;
  })();

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    const field = fieldRef.current;
    if (!field) return;
    const tokens = Array.from(field.querySelectorAll<HTMLElement>('.var-token'));
    const hit = tokens.find((token) => inside(token.getBoundingClientRect(), event.clientX, event.clientY));
    if (!hit) {
      setHover(null);
      return;
    }
    const rect = hit.getBoundingClientRect();
    setHover({
      name: hit.dataset.name ?? '',
      left: Math.min(rect.left, window.innerWidth - 300),
      top: Math.min(rect.bottom + 6, window.innerHeight - 96)
    });
  };

  const hoverInfo = hover ? infoByName.get(hover.name) : undefined;

  return (
    <div
      ref={fieldRef}
      className={`variable-field ${fieldClassName}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <div className="variable-highlight" aria-hidden="true">
        {segments.map((segment, index) =>
          segment.name ? (
            <span
              key={index}
              className={`var-token ${segment.info ? '' : 'missing'}`}
              data-name={segment.name}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </div>
      <input
        ref={inputRef}
        className={`variable-input ${className}`.trim()}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck={spellCheck}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        data-url-input={dataUrlInput || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(closeSuggestions, 120)}
        onFocus={() => {
          const input = inputRef.current;
          if (input) openSuggestions(value, input.selectionStart ?? value.length);
        }}
      />
      {hover && (
        <div className="variable-tooltip" style={{ left: hover.left, top: hover.top }} role="tooltip">
          <code>{`{{${hover.name}}}`}</code>
          <span>{hoverInfo ? hoverInfo.value || '—' : t('Undefined variable')}</span>
          {hoverInfo && <small>{scopeLabel(hoverInfo.scope)}</small>}
        </div>
      )}
      {suggestions && popover && (
        <div
          className="variable-suggest"
          style={{ left: popover.left, top: popover.top, width: popover.width }}
          role="listbox"
        >
          {suggestions.map((variable, index) => (
            <button
              key={variable.name}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(variable.name)}
            >
              <span className="variable-suggest-name">{`{{${variable.name}}}`}</span>
              <span className="variable-suggest-value">{variable.value || '—'}</span>
              <span className="variable-suggest-scope">{scopeLabel(variable.scope)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
