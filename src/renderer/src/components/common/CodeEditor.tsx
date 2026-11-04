import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useSettingsStore, resolvedTheme } from '../../stores/settingsStore';
import { useI18n } from '../../i18n';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: number | string;
  path?: string;
  placeholder?: string;
  className?: string;
  wordWrap?: boolean;
  onMount?: OnMount;
}

export function CodeEditor({
  value,
  onChange,
  language = 'plaintext',
  readOnly = false,
  height = 260,
  path,
  className = '',
  wordWrap: wrapOverride,
  onMount: onMountProp
}: CodeEditorProps): React.JSX.Element {
  const theme = useSettingsStore((state) => state.preference.theme);
  const fontSize = useSettingsStore((state) => state.preference.editorFontSize);
  const wordWrap = useSettingsStore((state) => state.preference.wordWrap);
  const ref = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { t } = useI18n();

  const onMount: OnMount = (instance, monacoInstance) => {
    ref.current = instance;
    onMountProp?.(instance, monacoInstance);
  };

  return (
    <div className={`code-editor ${className}`} data-readonly={readOnly || undefined}>
      <Editor
        height={height}
        path={path}
        language={language}
        value={value}
        theme={resolvedTheme(theme) === 'dark' ? 'pigeon-dark' : 'pigeon-light'}
        onChange={(next) => onChange?.(next ?? '')}
        onMount={onMount}
        loading={<div className="editor-loading">{t('Loading editor…')}</div>}
        options={{
          readOnly,
          fontSize,
          fontFamily: '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          wordWrap: (wrapOverride ?? wordWrap) ? 'on' : 'off',
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          renderLineHighlight: readOnly ? 'none' : 'line',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 10, bottom: 10 },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
          contextmenu: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          fixedOverflowWidgets: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          guides: { indentation: true, bracketPairs: false }
        }}
      />
    </div>
  );
}

export function getEditorSelection(editorInstance: editor.IStandaloneCodeEditor | null): string {
  if (!editorInstance) return '';
  const selection = editorInstance.getSelection();
  if (!selection) return '';
  return editorInstance.getModel()?.getValueInRange(selection) ?? '';
}
