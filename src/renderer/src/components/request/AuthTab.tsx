import type { AuthConfig, AuthType } from '@shared/types';
import type { WorkspaceTab } from '../../stores/tabStore';
import { Lock, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';

const AUTH_TYPES: Array<{ id: AuthType; label: string; hint: string }> = [
  { id: 'none', label: 'No auth', hint: 'Send without an Authorization header.' },
  { id: 'bearer', label: 'Bearer token', hint: 'Adds Authorization: Bearer <token>.' },
  { id: 'basic', label: 'Basic auth', hint: 'Base64-encodes a username and password.' },
  { id: 'apikey', label: 'API key', hint: 'Adds a key as a header or query parameter.' }
];

export function AuthTab({
  tab,
  update
}: {
  tab: WorkspaceTab;
  update: (patch: Partial<WorkspaceTab['draft']>) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const auth = tab.draft.auth;
  const setAuth = (patch: Partial<AuthConfig>): void => update({ auth: { ...auth, ...patch } });

  const preview = (() => {
    if (auth.type === 'bearer') return `Authorization: Bearer ${auth.bearer?.token || '{{token}}'}`;
    if (auth.type === 'basic') return `Authorization: Basic ${auth.basic?.username ? `${auth.basic.username}:${auth.basic.password ? '••••' : ''}` : '{{username}}:{{password}}'}`;
    if (auth.type === 'apikey' && auth.apikey) {
      return auth.apikey.in === 'query'
        ? `${auth.apikey.key || 'api_key'}=${auth.apikey.value || '{{apiKey}}'} (query)`
        : `${auth.apikey.key || 'X-API-Key'}: ${auth.apikey.value || '{{apiKey}}'}`;
    }
    return '';
  })();

  return (
    <div className="tab-pane auth-pane">
      <div className="auth-layout">
        <div className="auth-types">
          {AUTH_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`auth-type ${auth.type === type.id ? 'active' : ''}`}
              onClick={() => setAuth({ type: type.id })}
            >
              <span className="auth-type-dot" />
              <span>
                <strong>{t(type.label)}</strong>
                <small>{t(type.hint)}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="auth-form">
          {auth.type === 'none' && (
            <div className="auth-empty">
              <ShieldCheck size={26} />
              <h4>{t('No authorization')}</h4>
              <p>{t('This request will be sent without auth credentials. You can still add an Authorization header manually.')}</p>
            </div>
          )}

          {auth.type === 'bearer' && (
            <>
              <label className="field-label" htmlFor="auth-token">{t('Token')}</label>
              <input
                id="auth-token"
                className="text-input mono-input"
                value={auth.bearer?.token ?? ''}
                placeholder="{{token}} or paste a token"
                onChange={(event) => setAuth({ bearer: { token: event.target.value } })}
                spellCheck={false}
              />
              <p className="form-hint">{t('The token is rendered with environment variables when the request is sent.')}</p>
            </>
          )}

          {auth.type === 'basic' && (
            <div className="two-col">
              <div>
                <label className="field-label" htmlFor="auth-username">{t('Username')}</label>
                <input
                  id="auth-username"
                  className="text-input mono-input"
                  value={auth.basic?.username ?? ''}
                  placeholder="{{username}}"
                  onChange={(event) => setAuth({ basic: { username: event.target.value, password: auth.basic?.password ?? '' } })}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="auth-password">{t('Password')}</label>
                <input
                  id="auth-password"
                  type="password"
                  className="text-input mono-input"
                  value={auth.basic?.password ?? ''}
                  placeholder="{{password}}"
                  onChange={(event) => setAuth({ basic: { username: auth.basic?.username ?? '', password: event.target.value } })}
                />
              </div>
            </div>
          )}

          {auth.type === 'apikey' && (
            <>
              <div className="two-col">
                <div>
                  <label className="field-label" htmlFor="apikey-key">{t('Key')}</label>
                  <input
                    id="apikey-key"
                    className="text-input mono-input"
                    value={auth.apikey?.key ?? ''}
                    placeholder="X-API-Key"
                    onChange={(event) =>
                      setAuth({
                        apikey: {
                          key: event.target.value,
                          value: auth.apikey?.value ?? '',
                          in: auth.apikey?.in ?? 'header'
                        }
                      })
                    }
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="apikey-value">{t('Value')}</label>
                  <input
                    id="apikey-value"
                    className="text-input mono-input"
                    value={auth.apikey?.value ?? ''}
                    placeholder="{{apiKey}}"
                    onChange={(event) =>
                      setAuth({
                        apikey: {
                          key: auth.apikey?.key ?? '',
                          value: event.target.value,
                          in: auth.apikey?.in ?? 'header'
                        }
                      })
                    }
                    spellCheck={false}
                  />
                </div>
              </div>
              <label className="field-label" htmlFor="apikey-in" style={{ marginTop: 16 }}>{t('Add to')}</label>
              <select
                id="apikey-in"
                className="select-input"
                value={auth.apikey?.in ?? 'header'}
                onChange={(event) =>
                  setAuth({
                    apikey: {
                      key: auth.apikey?.key ?? '',
                      value: auth.apikey?.value ?? '',
                      in: event.target.value as 'header' | 'query'
                    }
                  })
                }
              >
                <option value="header">{t('Header value')}</option>
                <option value="query">{t('Query parameter')}</option>
              </select>
            </>
          )}

          {preview && (
            <div className="auth-preview">
              <Lock size={13} />
              <code>{preview}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
