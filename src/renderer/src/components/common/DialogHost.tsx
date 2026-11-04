import { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18n } from '../../i18n';

export function DialogHost(): React.JSX.Element {
  const prompt = useUiStore((state) => state.prompt);
  const closePrompt = useUiStore((state) => state.closePrompt);
  const confirm = useUiStore((state) => state.confirm);
  const closeConfirm = useUiStore((state) => state.closeConfirm);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setValue(prompt?.initialValue ?? '');
    setBusy(false);
  }, [prompt]);

  const submitPrompt = async (): Promise<void> => {
    if (!prompt || busy) return;
    if (!value.trim()) return;
    setBusy(true);
    try {
      await prompt.onSubmit(value.trim());
      closePrompt();
    } catch {
      // Keep the dialog open; the store has already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async (): Promise<void> => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await confirm.onConfirm();
      closeConfirm();
    } catch {
      // Keep the dialog open; the store has already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={Boolean(prompt)}
        onClose={closePrompt}
        title={prompt?.title ?? ''}
        description={t('Press Enter to confirm.')}
        width={430}
        footer={
          <>
            <Button variant="ghost" onClick={closePrompt}>
              {t('Cancel')}
            </Button>
            <Button variant="primary" onClick={() => void submitPrompt()} disabled={!value.trim() || busy}>
              {prompt?.confirmLabel ?? t('Create')}
            </Button>
          </>
        }
      >
        <label className="field-label" htmlFor="prompt-value">
          {prompt?.label}
        </label>
        <input
          id="prompt-value"
          className="text-input"
          autoFocus
          value={value}
          placeholder={prompt?.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submitPrompt();
          }}
        />
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={closeConfirm}
        title={confirm?.title ?? ''}
        width={430}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              {t('Cancel')}
            </Button>
            <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={() => void submitConfirm()} disabled={busy}>
              {confirm?.confirmLabel ?? t('Confirm')}
            </Button>
          </>
        }
      >
        <p className="confirm-message">{confirm?.message}</p>
      </Modal>
    </>
  );
}
