import { useEffect, useRef } from 'react';
import { Copy, Terminal } from 'lucide-react';
import type { ResponseResult } from '@shared/types';
import { useUiStore } from '../../stores/uiStore';
import { formatClock } from '../../utils/format';
import { EmptyState } from '../common/EmptyState';
import { useI18n } from '../../i18n';

export function ResponseConsole({ response }: { response: ResponseResult }): React.JSX.Element {
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [response.consoleLogs]);

  if (response.consoleLogs.length === 0) {
    return (
      <EmptyState
        icon={<Terminal size={26} />}
        title={t('No console output')}
        description={t('Use console.log() in pre-request or test scripts to inspect values.')}
      />
    );
  }

  return (
    <div className="console-view">
      <div className="console-toolbar">
        <span>{t('{count} logs', { count: response.consoleLogs.length })}</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            void navigator.clipboard.writeText(
              response.consoleLogs.map((log) => `[${log.scope}] ${log.message}`).join('\n')
            );
            toast('success', t('Console copied'));
          }}
        >
          <Copy size={13} /> {t('Copy')}
        </button>
      </div>
      <div className="console-lines">
        {response.consoleLogs.map((log) => (
          <div className={`console-line level-${log.level}`} key={log.id}>
            <span className="console-time">{formatClock(log.timestamp)}</span>
            <span className="console-scope">{log.scope === 'pre-request' ? 'PRE' : 'TEST'}</span>
            <span className="console-level">{log.level.toUpperCase()}</span>
            <span className="console-message">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
