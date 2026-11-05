import { z } from 'zod';
import { HTTP_METHODS } from '@shared/types';

export const paramSchema = z.object({
  key: z.string().max(10000),
  value: z.string().max(500000),
  enabled: z.boolean(),
  description: z.string().max(5000).optional(),
  type: z.enum(['text', 'file']).optional(),
  filePath: z.string().max(8192).optional()
});

export const bodySchema = z.object({
  mode: z.enum(['none', 'formdata', 'urlencoded', 'raw', 'binary']),
  raw: z.string().max(5_000_000).optional(),
  rawLanguage: z.enum(['json', 'xml', 'text']).optional(),
  formdata: z.array(paramSchema).max(2000).optional(),
  urlencoded: z.array(paramSchema).max(2000).optional(),
  binaryFilePath: z.string().max(8192).optional()
});

export const authSchema = z.object({
  type: z.enum(['none', 'basic', 'bearer', 'apikey']),
  basic: z.object({ username: z.string().max(10000), password: z.string().max(10000) }).optional(),
  bearer: z.object({ token: z.string().max(100000) }).optional(),
  apikey: z
    .object({
      key: z.string().max(10000),
      value: z.string().max(100000),
      in: z.enum(['header', 'query'])
    })
    .optional()
});

export const requestDefinitionSchema = z.object({
  name: z.string().min(1).max(500),
  method: z.enum(HTTP_METHODS),
  url: z.string().max(200000),
  queryParams: z.array(paramSchema).max(2000),
  headers: z.array(paramSchema).max(2000),
  body: bodySchema,
  preRequestScript: z.string().max(500000),
  testScript: z.string().max(500000),
  auth: authSchema
});

export const variableEntrySchema = z.object({
  key: z.string().max(10000),
  value: z.string().max(500000),
  enabled: z.boolean()
});

export const environmentVariableSchema = z.object({
  key: z.string().max(10000),
  value: z.string().max(500000),
  secret: z.boolean(),
  enabled: z.boolean(),
  hasValue: z.boolean().optional()
});

export const preferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['system', 'en', 'zh-CN']),
  timeoutMs: z.number().int().min(100).max(600000),
  followRedirect: z.boolean(),
  maxResponseSizeMb: z.number().int().min(1).max(500),
  maxRedirects: z.number().int().min(0).max(50),
  scriptTimeoutMs: z.number().int().min(100).max(30000),
  historyLimit: z.number().int().min(10).max(10000),
  defaultBodyMode: z.enum(['none', 'formdata', 'urlencoded', 'raw', 'binary']),
  editorFontSize: z.number().int().min(10).max(24),
  wordWrap: z.boolean(),
  proxy: z.object({
    enable: z.boolean(),
    mode: z.enum(['system', 'custom']),
    customUrl: z.string().max(4096).optional()
  }),
  ssl: z.object({
    rejectUnauthorized: z.boolean(),
    caPaths: z.array(z.string().max(8192)).max(50),
    clientCerts: z
      .array(
        z.object({
          host: z.string().max(500),
          kind: z.enum(['pem', 'pfx']),
          certPath: z.string().max(8192),
          keyPath: z.string().max(8192).optional(),
          passphrase: z.string().max(10000).optional()
        })
      )
      .max(50)
  }),
  shortcuts: z.object({
    send: z.string().max(120),
    newTab: z.string().max(120),
    closeTab: z.string().max(120),
    save: z.string().max(120),
    focusUrl: z.string().max(120)
  }),
  dataDir: z.string().max(8192)
});

export const sendRequestSchema = z.object({
  requestId: z.string().min(1).max(120),
  request: requestDefinitionSchema,
  collectionId: z.string().max(120).optional(),
  environmentId: z.string().max(120).optional(),
  localVariables: z.record(z.string().max(10000), z.string().max(500000)).optional(),
  recordHistory: z.boolean().optional()
});

export const readTextSchema = z.object({
  bodyId: z.string().uuid(),
  offset: z.number().int().min(0),
  length: z.number().int().min(1).max(2 * 1024 * 1024)
});

export const saveResponseSchema = z.object({
  bodyId: z.string().uuid(),
  suggestedName: z.string().max(300)
});
