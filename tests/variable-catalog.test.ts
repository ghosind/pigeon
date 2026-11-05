import { describe, expect, it } from 'vitest';
import type { Environment, EnvironmentVariable } from '@shared/types';
import { buildVariableCatalog, variableMap } from '../src/renderer/src/utils/variableCatalog';

function variable(key: string, value: string, extra: Partial<EnvironmentVariable> = {}): EnvironmentVariable {
  return { key, value, secret: false, enabled: true, ...extra };
}

const globals = [variable('host', 'global.example'), variable('region', 'us')];
const environments = [
  {
    id: 'env-1',
    name: 'Local',
    isActive: true,
    isDirty: false,
    createdAt: 1,
    updatedAt: 1,
    variables: [
      variable('host', 'local.example'),
      variable('token', 'stored', { secret: true, hasValue: true }),
      variable('disabled', 'no', { enabled: false })
    ]
  },
  {
    id: 'env-2',
    name: 'Other',
    isActive: false,
    isDirty: false,
    createdAt: 1,
    updatedAt: 1,
    variables: [variable('host', 'other.example')]
  }
] as Environment[];

describe('variable catalog', () => {
  it('prefers the active environment over globals and skips disabled variables', () => {
    const catalog = buildVariableCatalog(environments, globals);
    const byName = variableMap(catalog);
    expect(byName.get('host')?.value).toBe('local.example');
    expect(byName.get('host')?.scope).toBe('environment');
    expect(byName.get('region')?.scope).toBe('global');
    expect(byName.has('disabled')).toBe(false);
  });

  it('masks stored secrets and exposes dynamic variables', () => {
    const byName = variableMap(buildVariableCatalog(environments, globals));
    expect(byName.get('token')?.value).toBe('••••••••');
    expect(byName.get('$timestamp')?.scope).toBe('dynamic');
  });
});
