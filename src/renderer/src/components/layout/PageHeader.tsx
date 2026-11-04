import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useI18n } from '../../i18n';

export function PageHeader({
  title,
  eyebrow,
  description,
  actions
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <header className="subheader">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> {t('Workspace')}
      </button>
      <div className="subheader-brand">
        <Logo size={22} />
      </div>
      <div className="subheader-title">
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="subheader-actions">{actions}</div>
    </header>
  );
}
