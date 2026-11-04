import { describe, expect, it } from 'vitest';
import { listTemplateVariables, resolveTemplate } from '@shared/utils/variables';
import { addQueryParam, buildUrl, normalizeUrl, parseUrl, queryRowsFromUrl } from '@shared/utils/url';

describe('variable resolution', () => {
  it('uses local > environment > global precedence', () => {
    const result = resolveTemplate('{{host}}/{{id}}', {
      globals: { host: 'global.example', id: 'g' },
      environment: { host: 'env.example', id: 'e' },
      local: { host: 'local.example' }
    });
    expect(result.value).toBe('local.example/e');
  });

  it('resolves nested placeholders', () => {
    const result = resolveTemplate('{{protocol}}://{{host}}/v1', {
      environment: { protocol: 'https', host: '{{base}}', base: 'api.example.com' }
    });
    expect(result.value).toBe('https://api.example.com/v1');
  });

  it('keeps unresolved placeholders and reports them', () => {
    const result = resolveTemplate('{{baseUrl}}/users/{{id}}', { environment: { baseUrl: 'https://x.dev' } });
    expect(result.value).toBe('https://x.dev/users/{{id}}');
    expect(result.unresolved).toContain('id');
  });

  it('supports dynamic variables', () => {
    const result = resolveTemplate('{{$timestamp}}', {});
    expect(result.value).toMatch(/^\d{10}$/);
  });

  it('lists unique template names', () => {
    expect(listTemplateVariables('{{a}}/{{b}}/{{a}}')).toEqual(['a', 'b']);
  });
});

describe('URL query handling', () => {
  it('parses and decodes query pairs', () => {
    const parsed = parseUrl('https://api.test/users?limit=10&q=hello%20world#top');
    expect(parsed.base).toBe('https://api.test/users');
    expect(parsed.hash).toBe('#top');
    expect(parsed.params[1]).toMatchObject({ key: 'q', value: 'hello world', enabled: true });
  });

  it('rebuilds URL while preserving templates and skipping disabled rows', () => {
    const rows = queryRowsFromUrl('https://api.test?limit=10');
    rows.push({ key: 'token', value: '{{token}}', enabled: true });
    rows.push({ key: 'off', value: 'x', enabled: false });
    expect(buildUrl('https://api.test?limit=10', rows)).toBe('https://api.test?limit=10&token={{token}}');
  });

  it('adds a query parameter without dropping existing ones', () => {
    expect(addQueryParam('https://api.test?a=1', 'key', 'v')).toBe('https://api.test?a=1&key=v');
  });

  it('normalizes scheme-less URLs', () => {
    expect(normalizeUrl('localhost:3000/api')).toBe('http://localhost:3000/api');
    expect(normalizeUrl('api.example.com')).toBe('https://api.example.com');
    expect(normalizeUrl('https://api.example.com')).toBe('https://api.example.com');
  });
});
