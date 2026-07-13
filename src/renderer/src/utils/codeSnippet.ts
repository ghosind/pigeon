/**
 * codeSnippet — generates API request code in multiple languages.
 *
 * Supported languages: curl, javascript (fetch), javascript (axios)
 */

export type SnippetLanguage = 'curl' | 'javascriptFetch' | 'javascriptAxios' | 'javascript'

export interface SnippetInput {
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
}

/**
 * Generate a code snippet for the given request in the specified language.
 */
export function generateSnippet(input: SnippetInput, language: SnippetLanguage): string {
  switch (language) {
    case 'curl':
      return generateCurl(input)
    case 'javascript':
    case 'javascriptAxios':
      return generateJavaScriptAxios(input)
    case 'javascriptFetch':
      return generateJavaScriptFetch(input)
    default:
      return generateCurl(input)
  }
}

function generateCurl(input: SnippetInput): string {
  const lines: string[] = [`curl -X ${input.method} '${input.url}'`]
  if (input.headers) {
    for (const [key, value] of Object.entries(input.headers)) {
      lines.push(`  -H '${key}: ${value}'`)
    }
  }
  if (input.body) {
    lines.push(`  -d '${input.body.replace(/'/g, "\\'")}'`)
  }
  return lines.join(' \\\n')
}

function generateJavaScriptAxios(input: SnippetInput): string {
  const lines: string[] = [
    `const axios = require('axios');`,
    ``,
    `const config = {`,
    `  method: '${input.method.toLowerCase()}',`,
    `  url: '${input.url}',`
  ]
  if (input.headers && Object.keys(input.headers).length > 0) {
    lines.push(`  headers: ${JSON.stringify(input.headers, null, 4).replace(/\n/g, '\n  ')},`)
  }
  if (input.body) {
    lines.push(`  data: ${input.body},`)
  }
  lines.push(`};`)
  lines.push(``)
  lines.push(`axios(config)`)
  lines.push(`  .then(response => console.log(response.data))`)
  lines.push(`  .catch(error => console.error(error));`)
  return lines.join('\n')
}

function generateJavaScriptFetch(input: SnippetInput): string {
  const options: string[] = []
  options.push(`  method: '${input.method.toUpperCase()}'`)

  const headerLines: string[] = []
  if (input.headers) {
    for (const [key, value] of Object.entries(input.headers)) {
      headerLines.push(`    '${key}': '${value}'`)
    }
  }
  if (input.body && !input.headers?.['Content-Type']) {
    headerLines.push(`    'Content-Type': 'application/json'`)
  }
  if (headerLines.length > 0) {
    options.push(`  headers: {\n${headerLines.join(',\n')}\n  }`)
  }

  if (input.body) {
    options.push(
      `  body: ${input.body.startsWith('{') || input.body.startsWith('[') ? `JSON.stringify(${input.body})` : `'${input.body}'`}`
    )
  }

  const lines: string[] = [
    `const options = {`,
    options.join(',\n'),
    `};`,
    ``,
    `fetch('${input.url}', options)`,
    `  .then(response => response.json())`,
    `  .then(data => console.log(data))`,
    `  .catch(error => console.error('Error:', error));`
  ]
  return lines.join('\n')
}
