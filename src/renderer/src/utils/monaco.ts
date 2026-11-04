import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import EditorWorker from '../../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from '../../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js?worker';
import CssWorker from '../../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker';
import HtmlWorker from '../../../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker';
import TsWorker from '../../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

interface MonacoEnvironmentShape {
  getWorker: (moduleId: string, label: string) => Worker;
}

(globalThis as unknown as { MonacoEnvironment: MonacoEnvironmentShape }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  }
};

monaco.editor.defineTheme('pigeon-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'string', foreground: '1F7A4D' },
    { token: 'number', foreground: 'B45309' },
    { token: 'keyword', foreground: '9B3D9B' },
    { token: 'comment', foreground: '8A857C', fontStyle: 'italic' },
    { token: 'key', foreground: '0F6CBD' },
    { token: 'delimiter', foreground: '6B665E' }
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#24221F',
    'editorLineNumber.foreground': '#B8B2A8',
    'editorLineNumber.activeForeground': '#6B665E',
    'editor.lineHighlightBackground': '#F7F5F0',
    'editor.selectionBackground': '#FAD9CD',
    'editorCursor.foreground': '#E8552D',
    'editorIndentGuide.background1': '#EFECE6',
    'editorWidget.border': '#E5E2DB',
    'editorSuggestWidget.background': '#FFFFFF',
    'editorSuggestWidget.border': '#E5E2DB',
    'scrollbarSlider.background': '#D8D3CA66',
    'scrollbarSlider.hoverBackground': '#C4BEB366'
  }
});

monaco.editor.defineTheme('pigeon-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string', foreground: '8CD9A8' },
    { token: 'number', foreground: 'E8B86A' },
    { token: 'keyword', foreground: 'D7A2E8' },
    { token: 'comment', foreground: '7F7A72', fontStyle: 'italic' },
    { token: 'key', foreground: '82BFFF' },
    { token: 'delimiter', foreground: 'B5AFA5' }
  ],
  colors: {
    'editor.background': '#1B1C1F',
    'editor.foreground': '#E8E4DD',
    'editorLineNumber.foreground': '#52545A',
    'editorLineNumber.activeForeground': '#9A958C',
    'editor.lineHighlightBackground': '#232428',
    'editor.selectionBackground': '#5E3328',
    'editorCursor.foreground': '#FF7A4D',
    'editorIndentGuide.background1': '#2B2C31',
    'editorWidget.border': '#33353B',
    'editorSuggestWidget.background': '#212226',
    'editorSuggestWidget.border': '#33353B',
    'scrollbarSlider.background': '#3A3C4266',
    'scrollbarSlider.hoverBackground': '#4A4C5266'
  }
});



loader.config({ monaco });

export { monaco };
