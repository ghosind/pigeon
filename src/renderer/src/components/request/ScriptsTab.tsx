import { useState } from 'react';
import { CheckCircle2, CircleX, Plus, Terminal } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CodeEditor } from '../common/CodeEditor';
import { Menu } from '../common/Menu';
import { useI18n } from '../../i18n';

const SNIPPETS: Array<{ label: string; code: string; event: 'pre' | 'test' | 'both' }> = [
  { label: 'Set an environment variable', code: 'pm.environment.set("key", "value");', event: 'both' },
  { label: 'Log a value', code: 'console.log("value:", pm.environment.get("key"));', event: 'both' },
  { label: 'Test status code', code: 'pm.test("Status is 200", () => pm.response.to.have.status(200));', event: 'test' },
  { label: 'Parse JSON response', code: 'const data = pm.response.json();\nconsole.log(data);', event: 'test' },
  { label: 'Test a JSON property', code: 'pm.test("Has expected property", () => pm.expect(pm.response.json()).to.have.property("id"));', event: 'test' },
  { label: 'Test response time', code: 'pm.test("Responds under 1s", () => pm.expect(pm.response.responseTime).to.be.below(1000));', event: 'test' },
  { label: 'Set a header', code: 'pm.request.headers.upsert({ key: "X-Debug", value: "1" });', event: 'pre' }
];

export function ScriptsTab({
  tab,
  update
}: {
  tab: WorkspaceTab;
  update: (patch: Partial<WorkspaceTab['draft']>) => void;
}): React.JSX.Element {
  const [active, setActive] = useState<'pre' | 'test'>('pre');
  const timeout = useSettingsStore((state) => state.preference.scriptTimeoutMs);
  const code = active === 'pre' ? tab.draft.preRequestScript : tab.draft.testScript;
  const tests = tab.response?.testResults ?? [];
  const { t } = useI18n();

  const setCode = (next: string): void => {
    update(active === 'pre' ? { preRequestScript: next } : { testScript: next });
  };

  return (
    <div className="tab-pane scripts-pane">
      <div className="scripts-toolbar">
        <div className="subtabs">
          <button type="button" className={active === 'pre' ? 'active' : ''} onClick={() => setActive('pre')}>
            {t('Pre-request')}
            {tab.draft.preRequestScript.trim() && <i className="tab-dot" />}
          </button>
          <button type="button" className={active === 'test' ? 'active' : ''} onClick={() => setActive('test')}>
            {t('Tests')}
            {tab.draft.testScript.trim() && <i className="tab-dot" />}
          </button>
        </div>
        <Menu
          width={250}
          trigger={
            <button type="button" className="btn btn-secondary btn-sm">
              <Plus size={13} /> {t('Snippet')}
            </button>
          }
          items={SNIPPETS.filter((snippet) => snippet.event === 'both' || snippet.event === active).map((snippet) => ({
            label: t(snippet.label),
            onSelect: () => setCode(`${code}${code.endsWith('\n') || !code ? '' : '\n'}${snippet.code}\n`)
          }))}
        />
      </div>
      <div className="script-note">
        <Terminal size={13} />
        <span>
          {t('Runs in an isolated JavaScript sandbox. No filesystem, network or Node APIs. Timeout {ms} ms.', { ms: timeout })}
        </span>
      </div>
      <CodeEditor
        value={code}
        onChange={setCode}
        language="javascript"
        height={286}
        path={`script-${tab.id}-${active}.js`}
      />
      <div className="script-help">
        <span><code>pm.environment</code>, <code>pm.globals</code>, <code>pm.request</code>, <code>pm.response</code></span>
        <span><code>pm.test()</code>, <code>pm.expect()</code>, <code>console.log()</code></span>
      </div>
      {active === 'test' && tests.length > 0 && (
        <div className="script-mini-results">
          <strong>{t('Last run')}</strong>
          {tests.map((test) => (
            <span key={test.name} className={test.passed ? 'pass' : 'fail'}>
              {test.passed ? <CheckCircle2 size={13} /> : <CircleX size={13} />}
              {test.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
