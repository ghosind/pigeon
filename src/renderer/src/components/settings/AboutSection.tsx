import { Button } from '../common/Button';
import { Logo } from '../common/Logo';
import { useSettingsStore } from '../../stores/settingsStore';
import { FieldGroup, SectionTitle } from './shared';
import { useI18n } from '../../i18n';

export function AboutSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const info = useSettingsStore((state) => state.info);
  const { t } = useI18n();

  return (
    <>
      <SectionTitle title={t('About Pigeon')} description={t('A local-first API debugging client.')} />
      <div className="about-card">
        <div className="about-logo"><Logo size={34} /></div>
        <div>
          <h3>Pigeon API Studio</h3>
          <p>{t('Version {version} · Electron {electron} · Node {node}', { version: info?.version ?? '', electron: info?.electronVersion ?? '', node: info?.nodeVersion ?? '' })}</p>
          <p>{t('Platform: {platform} · {mode}', { platform: info?.platform ?? '', mode: info?.portable ? t('Portable mode') : t('Installed mode') })}</p>
        </div>
      </div>
      <FieldGroup label={t('Diagnostics')}>
        <div className="button-row">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.pigeon.app.showItemInFolder(`${preference.dataDir}/logs`)}
          >
            {t('Open logs folder')}
          </Button>
        </div>
      </FieldGroup>
    </>
  );
}
