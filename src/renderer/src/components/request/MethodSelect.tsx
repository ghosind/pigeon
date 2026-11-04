import { Check, ChevronDown } from 'lucide-react';
import { HTTP_METHODS, type HttpMethod } from '@shared/types';
import { Menu } from '../common/Menu';
import { methodTone } from '../../utils/format';
import { useI18n } from '../../i18n';

export function MethodSelect({
  value,
  onChange
}: {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <Menu
      className="method-menu"
      width={132}
      trigger={
        <button type="button" className={`method-select ${methodTone(value)}`} aria-label={t('HTTP method')}>
          <span>{value}</span>
          <ChevronDown size={13} />
        </button>
      }
      items={HTTP_METHODS.map((method) => ({
        label: method,
        icon: method === value ? <Check size={14} /> : <span className={`method-dot ${methodTone(method)}`} />,
        onSelect: () => onChange(method)
      }))}
    />
  );
}
