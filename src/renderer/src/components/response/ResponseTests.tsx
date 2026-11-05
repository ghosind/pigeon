import { CheckCircle2, CircleX, FlaskConical } from 'lucide-react';
import type { ResponseResult } from '@shared/types';
import { EmptyState } from '../common/EmptyState';
import { useI18n } from '../../i18n';

export function ResponseTests({ response }: { response: ResponseResult }): React.JSX.Element {
  const { t } = useI18n();
  const tests = response.testResults;
  const passed = tests.filter((test) => test.passed).length;

  if (tests.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical size={26} />}
        title={t('No tests ran')}
        description={t('Add pg.test() assertions in the Tests script to verify this response.')}
      />
    );
  }

  return (
    <div className="tests-view">
      <div className={`tests-summary ${passed === tests.length ? 'pass' : 'fail'}`}>
        <strong>{t('{passed}/{total} passing', { passed, total: tests.length })}</strong>
        <span>{passed === tests.length ? t('All assertions passed.') : t('{count} assertions failed.', { count: tests.length - passed })}</span>
      </div>
      <div className="tests-list">
        {tests.map((test, index) => (
          <div className={`test-line ${test.passed ? 'pass' : 'fail'}`} key={`${test.name}-${index}`}>
            {test.passed ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
            <div>
              <strong>{test.name}</strong>
              {test.error && <p>{test.error}</p>}
            </div>
            <span className="test-time">{test.durationMs} ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
