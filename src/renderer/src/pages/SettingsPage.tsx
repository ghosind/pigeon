import { useState } from 'react';
import {
  Database,
  Globe2,
  Info,
  Keyboard,
  Palette,
  Save,
  ShieldCheck,
  SlidersHorizontal
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { useSettingsStore } from '../stores/settingsStore';
import { AppearanceSection } from '../components/settings/AppearanceSection';
import { RequestDefaultsSection } from '../components/settings/RequestDefaultsSection';
import { ProxySection } from '../components/settings/ProxySection';
import { CertificatesSection } from '../components/settings/CertificatesSection';
import { DataSection } from '../components/settings/DataSection';
import { ShortcutsSection } from '../components/settings/ShortcutsSection';
import { AboutSection } from '../components/settings/AboutSection';
import { useI18n } from '../i18n';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Palette, component: AppearanceSection },
  { id: 'request', label: 'Request defaults', icon: SlidersHorizontal, component: RequestDefaultsSection },
  { id: 'proxy', label: 'Proxy', icon: Globe2, component: ProxySection },
  { id: 'certificates', label: 'Certificates', icon: ShieldCheck, component: CertificatesSection },
  { id: 'data', label: 'Data', icon: Database, component: DataSection },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, component: ShortcutsSection },
  { id: 'about', label: 'About', icon: Info, component: AboutSection }
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function SettingsPage(): React.JSX.Element {
  const [section, setSection] = useState<SectionId>('appearance');
  const saving = useSettingsStore((state) => state.saving);
  const save = useSettingsStore((state) => state.save);
  const load = useSettingsStore((state) => state.load);
  const Section = SECTIONS.find((entry) => entry.id === section)?.component ?? AppearanceSection;
  const { t } = useI18n();

  return (
    <div className="page-shell">
      <PageHeader
        title={t('Settings')}
        eyebrow={t('WORKSPACE')}
        description={t('Preferences are stored locally and take effect immediately.')}
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              <Icon size={16} /> {t(label)}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          <div className="settings-scroll"><Section /></div>
          <footer className="settings-footer">
            <span>{t('Changes are stored in the local database.')}</span>
            <div>
              <Button variant="ghost" onClick={() => void load()}>{t('Discard')}</Button>
              <Button variant="primary" icon={<Save size={14} />} onClick={() => void save()} disabled={saving}>
                {saving ? t('Saving…') : t('Save changes')}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
