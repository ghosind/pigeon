import type { AuthConfig, ParamItem, RequestDefinition } from '@shared/types';
import { addQueryParam } from '@shared/utils/url';

export interface CodeSnippet {
  id: string;
  label: string;
  language: string;
  code: string;
}

interface Prepared {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  form?: ParamItem[];
  fileField?: string;
  contentType?: string;
}

function enabled(rows: ParamItem[] | undefined): ParamItem[] {
  return (rows ?? []).filter((row) => row.enabled && row.key.trim());
}

function authHeaders(auth: AuthConfig): Record<string, string> {
  if (auth.type === 'bearer' && auth.bearer?.token) return { Authorization: `Bearer ${auth.bearer.token}` };
  if (auth.type === 'basic') {
    const username = auth.basic?.username ?? '';
    const password = auth.basic?.password ?? '';
    return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
  }
  return {};
}

function prepare(request: RequestDefinition): Prepared {
  const headers: Record<string, string> = {};
  for (const row of enabled(request.headers)) headers[row.key] = row.value;
  Object.assign(headers, authHeaders(request.auth));
  let url = request.url;
  if (request.auth.type === 'apikey' && request.auth.apikey?.key) {
    if (request.auth.apikey.in === 'query') {
      url = addQueryParam(url, request.auth.apikey.key, request.auth.apikey.value);
    } else {
      headers[request.auth.apikey.key] = request.auth.apikey.value;
    }
  }
  const body = request.body;
  if (body.mode === 'raw') {
    const contentType = body.rawLanguage === 'json' ? 'application/json' : body.rawLanguage === 'xml' ? 'application/xml' : 'text/plain';
    if (!headers['Content-Type']) headers['Content-Type'] = contentType;
    return { method: request.method, url, headers, body: body.raw ?? '' };
  }
  if (body.mode === 'urlencoded') {
    const params = new URLSearchParams();
    for (const row of enabled(body.urlencoded)) params.append(row.key, row.value);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return { method: request.method, url, headers, body: params.toString() };
  }
  if (body.mode === 'formdata') {
    return {
      method: request.method,
      url,
      headers,
      form: enabled(body.formdata),
      fileField: 'multipart/form-data'
    };
  }
  if (body.mode === 'binary') {
    return { method: request.method, url, headers, fileField: body.binaryFilePath || '<file-path>' };
  }
  return { method: request.method, url, headers };
}

function headerLines(headers: Record<string, string>, indent: string): string {
  return Object.entries(headers)
    .map(([key, value]) => `${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function curl(prepared: Prepared): string {
  const lines = [`curl -X ${prepared.method} ${shellQuote(prepared.url)}`];
  for (const [key, value] of Object.entries(prepared.headers)) {
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  }
  if (prepared.form) {
    for (const row of prepared.form) {
      if (row.type === 'file') lines.push(`  -F ${shellQuote(`${row.key}=@${row.filePath || '<file-path>'}`)}`);
      else lines.push(`  -F ${shellQuote(`${row.key}=${row.value}`)}`);
    }
  } else if (prepared.fileField) {
    lines.push(`  --data-binary ${shellQuote(`@${prepared.fileField}`)}`);
  } else if (prepared.body !== undefined) {
    lines.push(`  --data-raw ${shellQuote(prepared.body)}`);
  }
  return lines.join(' \\\n');
}

function fetchSnippet(prepared: Prepared): string {
  const init: string[] = [`  method: ${JSON.stringify(prepared.method)},`];
  if (Object.keys(prepared.headers).length) init.push(`  headers: {\n${headerLines(prepared.headers, '    ')}\n  },`);
  if (prepared.form) {
    init.push('  body: formData,');
    return `const formData = new FormData();\n${prepared.form
      .map((row) =>
        row.type === 'file'
          ? `formData.append(${JSON.stringify(row.key)}, fileInput.files[0]); // ${row.filePath || 'choose a file'}`
          : `formData.append(${JSON.stringify(row.key)}, ${JSON.stringify(row.value)});`
      )
      .join('\n')}\n\nconst response = await fetch(${JSON.stringify(prepared.url)}, {\n${init.join('\n')}\n});`;
  }
  if (prepared.body !== undefined) init.push(`  body: ${JSON.stringify(prepared.body)},`);
  return `const response = await fetch(${JSON.stringify(prepared.url)}, {\n${init.join('\n')}\n});\nconst data = await response.json();\nconsole.log(data);`;
}

function python(prepared: Prepared): string {
  const args = [`url=${JSON.stringify(prepared.url)}`];
  if (Object.keys(prepared.headers).length) args.push(`headers=${JSON.stringify(prepared.headers)}`);
  if (prepared.form) {
    const files = prepared.form
      .filter((row) => row.type === 'file')
      .map((row) => `    ${JSON.stringify(row.key)}: open(${JSON.stringify(row.filePath || '<file-path>')}, "rb")`);
    const data = prepared.form
      .filter((row) => row.type !== 'file')
      .map((row) => `    ${JSON.stringify(row.key)}: ${JSON.stringify(row.value)}`);
    if (files.length) args.push(`files={\n${files.join(',\n')}\n  }`);
    if (data.length) args.push(`data={\n${data.join(',\n')}\n  }`);
  } else if (prepared.fileField) {
    args.push(`data=open(${JSON.stringify(prepared.fileField)}, "rb")`);
  } else if (prepared.body !== undefined) {
    args.push(`data=${JSON.stringify(prepared.body)}`);
  }
  return `import requests\n\nresponse = requests.request(\n  ${JSON.stringify(prepared.method)},\n  ${args.join(',\n  ')}\n)\nprint(response.status_code)\nprint(response.text)`;
}

function axios(prepared: Prepared): string {
  const lines = [`const response = await axios.request({`, `  method: ${JSON.stringify(prepared.method)},`, `  url: ${JSON.stringify(prepared.url)},`];
  if (Object.keys(prepared.headers).length) lines.push(`  headers: {\n${headerLines(prepared.headers, '    ')}\n  },`);
  if (prepared.form) {
    lines.push(`  data: formData,`);
    const pre = `const FormData = require('form-data');\nconst formData = new FormData();\n${prepared.form
      .map((row) =>
        row.type === 'file'
          ? `formData.append(${JSON.stringify(row.key)}, require('fs').createReadStream(${JSON.stringify(row.filePath || '<file-path>')}));`
          : `formData.append(${JSON.stringify(row.key)}, ${JSON.stringify(row.value)});`
      )
      .join('\n')}\n\n`;
    return `${pre}${lines.join('\n')}\n});\nconsole.log(response.data);`;
  }
  if (prepared.body !== undefined) lines.push(`  data: ${JSON.stringify(prepared.body)},`);
  return `const axios = require('axios');\n\n${lines.join('\n')}\n});\nconsole.log(response.data);`;
}

function go(prepared: Prepared): string {
  const bodyExpr = prepared.body !== undefined ? `strings.NewReader(${JSON.stringify(prepared.body)})` : 'nil';
  const headerLines = Object.entries(prepared.headers)
    .map(([key, value]) => `req.Header.Set(${JSON.stringify(key)}, ${JSON.stringify(value)})`)
    .join('\n');
  return `package main\n\nimport (\n  "fmt"\n  "net/http"\n  "strings"\n)\n\nfunc main() {\n  req, err := http.NewRequest(${JSON.stringify(prepared.method)}, ${JSON.stringify(prepared.url)}, ${bodyExpr})\n  if err != nil { panic(err) }\n${headerLines ? `${headerLines.split('\n').map((line) => `  ${line}`).join('\n')}\n` : ''}  res, err := http.DefaultClient.Do(req)\n  if err != nil { panic(err) }\n  defer res.Body.Close()\n  fmt.Println(res.Status)\n}`;
}

function java(prepared: Prepared): string {
  const builder = [
    `OkHttpClient client = new OkHttpClient();`,
    prepared.body !== undefined
      ? `RequestBody body = RequestBody.create(${JSON.stringify(prepared.body)}, MediaType.parse(${JSON.stringify(prepared.headers['Content-Type'] ?? 'text/plain')}));`
      : `RequestBody body = null;`,
    `Request request = new Request.Builder()`,
    `  .url(${JSON.stringify(prepared.url)})`,
    `  .method(${JSON.stringify(prepared.method)}, body)`
  ];
  for (const [key, value] of Object.entries(prepared.headers)) {
    builder.push(`  .addHeader(${JSON.stringify(key)}, ${JSON.stringify(value)})`);
  }
  builder.push('  .build();', 'try (Response response = client.newCall(request).execute()) {', '  System.out.println(response.code());', '}');
  return builder.join('\n');
}

function csharp(prepared: Prepared): string {
  const lines = [
    'using var client = new HttpClient();',
    `using var request = new HttpRequestMessage(HttpMethod.${prepared.method === 'DELETE' ? 'Delete' : prepared.method === 'POST' ? 'Post' : prepared.method === 'PUT' ? 'Put' : prepared.method === 'PATCH' ? 'Patch' : 'Get'}, ${JSON.stringify(prepared.url)});`
  ];
  for (const [key, value] of Object.entries(prepared.headers)) {
    if (key.toLowerCase() === 'content-type') continue;
    lines.push(`request.Headers.TryAddWithoutValidation(${JSON.stringify(key)}, ${JSON.stringify(value)});`);
  }
  if (prepared.body !== undefined) {
    lines.push(`request.Content = new StringContent(${JSON.stringify(prepared.body)}, Encoding.UTF8, ${JSON.stringify(prepared.headers['Content-Type']?.split(';')[0] ?? 'text/plain')});`);
  }
  lines.push('using var response = await client.SendAsync(request);', 'Console.WriteLine((int)response.StatusCode);', 'Console.WriteLine(await response.Content.ReadAsStringAsync());');
  return `using System.Net.Http;\nusing System.Text;\n\n${lines.join('\n')}`;
}

export function generateCodeSnippets(request: RequestDefinition): CodeSnippet[] {
  const prepared = prepare(request);
  return [
    { id: 'curl', label: 'cURL', language: 'bash', code: curl(prepared) },
    { id: 'fetch', label: 'JavaScript — fetch', language: 'javascript', code: fetchSnippet(prepared) },
    { id: 'axios', label: 'Node.js — axios', language: 'javascript', code: axios(prepared) },
    { id: 'python', label: 'Python — requests', language: 'python', code: python(prepared) },
    { id: 'go', label: 'Go — net/http', language: 'go', code: go(prepared) },
    { id: 'java', label: 'Java — OkHttp', language: 'java', code: java(prepared) },
    { id: 'csharp', label: 'C# — HttpClient', language: 'csharp', code: csharp(prepared) }
  ];
}
