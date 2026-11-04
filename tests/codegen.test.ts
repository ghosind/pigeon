import { describe, expect, it } from 'vitest';
import type { RequestDefinition } from '@shared/types';
import { generateCodeSnippets } from '../src/renderer/src/utils/codegen';

function request(overrides: Partial<RequestDefinition> = {}): RequestDefinition {
  return {
    name: 'Codegen',
    method: 'POST',
    url: 'https://api.example.com/v1/items?limit=5',
    queryParams: [],
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    body: { mode: 'raw', raw: '{"name":"pigeon"}', rawLanguage: 'json', formdata: [], urlencoded: [], binaryFilePath: '' },
    preRequestScript: '',
    testScript: '',
    auth: { type: 'bearer', bearer: { token: '{{token}}' } },
    ...overrides
  };
}

describe('code snippet generation', () => {
  it('generates cURL with method, headers, auth and body', () => {
    const snippet = generateCodeSnippets(request()).find((entry) => entry.id === 'curl')!;
    expect(snippet.code).toContain('curl -X POST');
    expect(snippet.code).toContain('Authorization: Bearer {{token}}');
    expect(snippet.code).toContain('--data-raw');
    expect(snippet.code).toContain('Content-Type: application/json');
  });

  it('generates fetch and python examples', () => {
    const snippets = generateCodeSnippets(request());
    expect(snippets.find((entry) => entry.id === 'fetch')?.code).toContain('await fetch');
    expect(snippets.find((entry) => entry.id === 'python')?.code).toContain('requests.request');
    expect(snippets.find((entry) => entry.id === 'go')?.code).toContain('http.NewRequest');
  });

  it('emits a form-data example with file placeholders', () => {
    const snippet = generateCodeSnippets(
      request({
        body: {
          mode: 'formdata',
          formdata: [
            { key: 'name', value: 'pigeon', enabled: true },
            { key: 'avatar', value: '', enabled: true, type: 'file', filePath: '/tmp/avatar.png' }
          ],
          raw: '',
          rawLanguage: 'json',
          urlencoded: [],
          binaryFilePath: ''
        }
      })
    ).find((entry) => entry.id === 'curl')!;
    expect(snippet.code).toContain('-F');
    expect(snippet.code).toContain('avatar=@/tmp/avatar.png');
  });

  it('adds API keys to the URL when configured as a query parameter', () => {
    const snippet = generateCodeSnippets(
      request({
        body: { mode: 'none', raw: '', rawLanguage: 'json', formdata: [], urlencoded: [], binaryFilePath: '' },
        auth: { type: 'apikey', apikey: { key: 'api_key', value: '{{key}}', in: 'query' } }
      })
    ).find((entry) => entry.id === 'curl')!;
    expect(snippet.code).toContain('api_key={{key}}');
  });
});
