/**
 * Orchestrates the full request pipeline: variable resolution, inherited
 * pre-request scripts, auth/body assembly, HTTP execution, tests and history.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  ApiResult,
  ConsoleLogEntry,
  RequestDefinition,
  ResponseMeta,
  ResponseResult,
  ScriptTestResult,
  SendRequestPayload
} from '@shared/types';
import { addQueryParam, normalizeUrl } from '@shared/utils/url';
import { resolveTemplate, type VariableScopes } from '@shared/utils/variables';
import type { CollectionRepository } from '../repositories/collection.repository';
import type { HistoryRepository } from '../repositories/history.repository';
import type { PreferenceRepository } from '../repositories/preference.repository';
import type { EnvironmentRepository, RuntimeScopes } from '../repositories/environment.repository';
import { AppError, toApiError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { mimeForPath } from '../utils/mime';
import type { BodyStore, StoredBody } from './body-store';
import { executeHttpRequest, type HttpResponseData } from './http-client';
import { buildMultipart } from './multipart';
import type { ProxyService } from './proxy.service';
import type { ScriptExecutionResult, ScriptResponseInput, ScriptRunner } from './script-runner';
import type { SslService } from './ssl.service';

const logger = createLogger('request-engine');

export interface RequestEngineDependencies {
  collections: CollectionRepository;
  environments: EnvironmentRepository;
  preferences: PreferenceRepository;
  history: HistoryRepository;
  bodyStore: BodyStore;
  scripts: ScriptRunner;
  proxy: ProxyService;
  ssl: SslService;
}

interface PreparedBody {
  buffer?: Buffer;
  contentType?: string;
}

interface ScriptAccumulator {
  logs: ConsoleLogEntry[];
  tests: ScriptTestResult[];
  environmentUpdates: Record<string, string>;
  globalUpdates: Record<string, string>;
  localUpdates: Record<string, string>;
}

function emptyAccumulator(): ScriptAccumulator {
  return { logs: [], tests: [], environmentUpdates: {}, globalUpdates: {}, localUpdates: {} };
}

function applyUpdates(target: Record<string, string>, updates: Record<string, string>): void {
  for (const [key, value] of Object.entries(updates)) {
    if (value === '') delete target[key];
    else target[key] = value;
  }
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function setHeader(headers: Record<string, string>, name: string, value: string): void {
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === name.toLowerCase());
  if (key) headers[key] = value;
  else headers[name] = value;
}

export class RequestEngine {
  private readonly active = new Map<string, AbortController>();

  constructor(private readonly deps: RequestEngineDependencies) {}

  cancel(requestId: string): void {
    const controller = this.active.get(requestId);
    if (controller) {
      controller.abort();
      logger.info('Request cancellation requested', { requestId });
    }
  }

  async execute(payload: SendRequestPayload): Promise<ApiResult<ResponseResult>> {
    if (this.active.has(payload.requestId)) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'A request with this id is already running' }
      };
    }
    const controller = new AbortController();
    this.active.set(payload.requestId, controller);
    const preferences = this.deps.preferences.get();
    const runtime: RuntimeScopes = this.deps.environments.runtimeScopes(payload.environmentId);
    const scopes: VariableScopes = {
      environment: { ...runtime.environment },
      folder: this.deps.collections.variableScope(payload.collectionId),
      globals: { ...runtime.globals },
      local: { ...(payload.localVariables ?? {}) }
    };
    const accumulation = emptyAccumulator();
    let definition = structuredClone(payload.request);
    let attempted = false;

    try {
      const chain = payload.collectionId ? this.deps.collections.scriptChain(payload.collectionId) : [];
      this.runPrerequestChain(chain, definition, scopes, runtime, accumulation, payload.requestId, preferences.scriptTimeoutMs);
      this.deps.environments.applyRuntimeUpdates(runtime.environmentId, accumulation.environmentUpdates, accumulation.globalUpdates);

      const built = this.buildRequest(definition, scopes, preferences);
      attempted = true;
      logger.info('Sending request', {
        method: built.method,
        host: this.safeHost(built.url),
        requestId: payload.requestId
      });
      const httpResult = await executeHttpRequest({
        url: built.url,
        method: built.method,
        headers: built.headers,
        body: built.body.buffer,
        timeoutMs: preferences.timeoutMs,
        followRedirect: preferences.followRedirect,
        maxRedirects: preferences.maxRedirects,
        maxResponseSize: preferences.maxResponseSizeMb * 1024 * 1024,
        signal: controller.signal,
        tlsFactory: (host) => this.deps.ssl.materialFor(host, preferences.ssl),
        agentFactory: (url) => this.deps.proxy.agentFor(url, preferences.proxy)
      });
      const contentType = httpResult.headers['content-type']?.[0] ?? '';
      const stored = this.deps.bodyStore.store(httpResult.body, contentType, httpResult.truncated);
      const testScripts = [
        ...chain.map((node) => ({ code: node.testScript, label: node.name })),
        ...(definition.testScript.trim() ? [{ code: definition.testScript, label: definition.name }] : [])
      ].filter((entry) => entry.code.trim());
      const bodyText = testScripts.length > 0 ? this.deps.bodyStore.fullText(stored.bodyId) : stored.bodyText ?? stored.bodyPreview ?? '';
      this.runTestChain(testScripts, definition, built, httpResult, bodyText, scopes, runtime, accumulation, payload.requestId, preferences.scriptTimeoutMs);
      this.deps.environments.applyRuntimeUpdates(runtime.environmentId, accumulation.environmentUpdates, accumulation.globalUpdates);

      const responseMeta = this.metaFrom(httpResult, contentType);
      if (payload.recordHistory !== false) {
        this.deps.history.add(payload.request, responseMeta, runtime.environmentName, preferences.historyLimit);
      }
      const result = this.toResponseResult(payload.requestId, httpResult, stored, accumulation, runtime, contentType);
      logger.info('Request completed', {
        requestId: payload.requestId,
        status: httpResult.status,
        durationMs: httpResult.durationMs,
        sizeBytes: httpResult.size
      });
      return { ok: true, data: result };
    } catch (error) {
      if (attempted && payload.recordHistory !== false && !(error instanceof AppError && error.code === 'REQUEST_CANCELLED') && !controller.signal.aborted) {
        this.recordFailureHistory(payload, runtime, preferences.historyLimit);
      }
      logger.warn('Request failed', {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      return { ok: false, error: toApiError(error) };
    } finally {
      this.active.delete(payload.requestId);
    }
  }

  private runPrerequestChain(
    chain: Array<{ name: string; preRequestScript: string }>,
    definition: RequestDefinition,
    scopes: VariableScopes,
    runtime: RuntimeScopes,
    accumulation: ScriptAccumulator,
    requestId: string,
    timeoutMs: number
  ): void {
    const scripts = [
      ...chain.filter((node) => node.preRequestScript.trim()).map((node) => ({ code: node.preRequestScript, label: node.name })),
      ...(definition.preRequestScript.trim() ? [{ code: definition.preRequestScript, label: definition.name }] : [])
    ];
    for (const script of scripts) {
      const result = this.runScript(script.code, 'prerequest', definition, undefined, scopes, runtime, timeoutMs, script.label);
      this.mergeScriptResult(result, accumulation);
      applyUpdates(scopes.environment ?? {}, result.environmentUpdates);
      applyUpdates(scopes.globals ?? {}, result.globalUpdates);
      applyUpdates(scopes.local ?? {}, result.localUpdates);
      if (result.error) {
        throw new AppError(
          result.timedOut ? 'SCRIPT_TIMEOUT' : 'SCRIPT_ERROR',
          `Pre-request script failed (${script.label}): ${result.error}`
        );
      }
      this.applyScriptRequest(definition, result);
    }
    void requestId;
  }

  private runTestChain(
    scripts: Array<{ code: string; label: string }>,
    definition: RequestDefinition,
    built: { method: string; url: string; headers: Record<string, string> },
    response: HttpResponseData,
    bodyText: string,
    scopes: VariableScopes,
    runtime: RuntimeScopes,
    accumulation: ScriptAccumulator,
    requestId: string,
    timeoutMs: number
  ): void {
    if (!scripts.length) return;
    const scriptResponse: ScriptResponseInput = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      bodyText,
      duration: response.durationMs,
      size: response.size
    };
    for (const script of scripts) {
      const result = this.runScript(script.code, 'test', definition, scriptResponse, scopes, runtime, timeoutMs, script.label, {
        method: built.method,
        url: built.url,
        headers: Object.entries(built.headers).map(([key, value]) => ({ key, value }))
      });
      this.mergeScriptResult(result, accumulation);
      applyUpdates(scopes.environment ?? {}, result.environmentUpdates);
      applyUpdates(scopes.globals ?? {}, result.globalUpdates);
      applyUpdates(scopes.local ?? {}, result.localUpdates);
      if (result.error) {
        accumulation.logs.push({
          id: randomUUID(),
          level: 'error',
          message: result.error,
          timestamp: Date.now(),
          scope: 'test'
        });
      }
    }
    void requestId;
  }

  private runScript(
    code: string,
    eventName: 'prerequest' | 'test',
    definition: RequestDefinition,
    response: ScriptResponseInput | undefined,
    scopes: VariableScopes,
    runtime: RuntimeScopes,
    timeoutMs: number,
    label: string,
    requestOverride?: { method: string; url: string; headers: Array<{ key: string; value: string }> }
  ): ScriptExecutionResult {
    const headers = requestOverride?.headers
      ?? definition.headers
        .filter((header) => header.enabled && header.key)
        .map((header) => ({ key: header.key, value: header.value }));
    return this.deps.scripts.run({
      code,
      eventName,
      timeoutMs,
      request: {
        name: label,
        method: requestOverride?.method ?? definition.method,
        url: requestOverride?.url ?? definition.url,
        headers,
        body: { mode: definition.body.mode, raw: definition.body.raw ?? '' }
      },
      response,
      environment: scopes.environment ?? {},
      globals: scopes.globals ?? {},
      variables: scopes.local ?? {},
      environmentName: runtime.environmentName
    });
  }

  private mergeScriptResult(result: ScriptExecutionResult, accumulation: ScriptAccumulator): void {
    accumulation.logs.push(...result.logs);
    accumulation.tests.push(...result.tests);
    applyUpdates(accumulation.environmentUpdates, result.environmentUpdates);
    applyUpdates(accumulation.globalUpdates, result.globalUpdates);
    applyUpdates(accumulation.localUpdates, result.localUpdates);
  }

  private applyScriptRequest(definition: RequestDefinition, result: ScriptExecutionResult): void {
    if (!result.request) return;
    definition.method = (result.request.method as RequestDefinition['method']) || definition.method;
    if (result.request.url) definition.url = result.request.url;
    if (Array.isArray(result.request.headers)) {
      definition.headers = result.request.headers.map((header) => ({
        key: header.key,
        value: header.value,
        enabled: true
      }));
    }
    if (definition.body.mode === 'raw' && result.request.bodyRaw) {
      definition.body.raw = result.request.bodyRaw;
    }
  }

  private buildRequest(
    definition: RequestDefinition,
    scopes: VariableScopes,
    preferences: ReturnType<PreferenceRepository['get']>
  ): { method: string; url: string; headers: Record<string, string>; body: PreparedBody } {
    const urlTemplate = resolveTemplate(definition.url, scopes);
    if (urlTemplate.unresolved.length > 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Unresolved variable${urlTemplate.unresolved.length > 1 ? 's' : ''}: ${urlTemplate.unresolved.join(', ')}`
      );
    }
    if (!urlTemplate.value.trim()) throw new AppError('VALIDATION_ERROR', 'Enter a request URL');
    let url = normalizeUrl(urlTemplate.value);
    try {
      new URL(url);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'The request URL is not valid');
    }

    const headers: Record<string, string> = {};
    for (const header of definition.headers) {
      if (!header.enabled || !header.key) continue;
      const key = resolveTemplate(header.key, scopes).value;
      const value = resolveTemplate(header.value, scopes).value;
      if (key) headers[key] = value;
    }

    if (definition.auth.type === 'basic') {
      const username = resolveTemplate(definition.auth.basic?.username ?? '', scopes).value;
      const password = resolveTemplate(definition.auth.basic?.password ?? '', scopes).value;
      setHeader(headers, 'Authorization', `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
    } else if (definition.auth.type === 'bearer') {
      const token = resolveTemplate(definition.auth.bearer?.token ?? '', scopes).value;
      if (token) setHeader(headers, 'Authorization', `Bearer ${token}`);
    } else if (definition.auth.type === 'apikey') {
      const key = resolveTemplate(definition.auth.apikey?.key ?? '', scopes).value;
      const value = resolveTemplate(definition.auth.apikey?.value ?? '', scopes).value;
      if (key) {
        if (definition.auth.apikey?.in === 'query') url = addQueryParam(url, key, value);
        else headers[key] = value;
      }
    }

    const body = this.buildBody(definition, scopes, headers);
    if (!headerValue(headers, 'user-agent')) headers['User-Agent'] = 'Pigeon/0.1.0';
    if (!headerValue(headers, 'accept')) headers.Accept = '*/*';
    if (!headerValue(headers, 'accept-encoding')) headers['Accept-Encoding'] = 'gzip, deflate, br';
    if (preferences.followRedirect && !headerValue(headers, 'connection')) headers.Connection = 'keep-alive';
    return { method: definition.method, url, headers, body };
  }

  private buildBody(
    definition: RequestDefinition,
    scopes: VariableScopes,
    headers: Record<string, string>
  ): PreparedBody {
    const body = definition.body;
    switch (body.mode) {
      case 'none':
        return {};
      case 'raw': {
        const raw = resolveTemplate(body.raw ?? '', scopes).value;
        if (!headerValue(headers, 'content-type')) {
          const language = body.rawLanguage ?? 'text';
          setHeader(headers, 'Content-Type', language === 'json' ? 'application/json' : language === 'xml' ? 'application/xml' : 'text/plain');
        }
        return { buffer: Buffer.from(raw, 'utf8') };
      }
      case 'urlencoded': {
        const params = new URLSearchParams();
        for (const row of body.urlencoded ?? []) {
          if (!row.enabled || !row.key) continue;
          params.append(
            resolveTemplate(row.key, scopes).value,
            resolveTemplate(row.value, scopes).value
          );
        }
        if (!headerValue(headers, 'content-type')) {
          setHeader(headers, 'Content-Type', 'application/x-www-form-urlencoded');
        }
        return { buffer: Buffer.from(params.toString(), 'utf8') };
      }
      case 'formdata': {
        const multipart = buildMultipart(body.formdata ?? [], scopes);
        if (!headerValue(headers, 'content-type')) setHeader(headers, 'Content-Type', multipart.contentType);
        return { buffer: multipart.body };
      }
      case 'binary': {
        const filePath = body.binaryFilePath ? resolveTemplate(body.binaryFilePath, scopes).value : '';
        if (!filePath) throw new AppError('VALIDATION_ERROR', 'Choose a binary file to upload');
        try {
          const buffer = readFileSync(filePath);
          if (!headerValue(headers, 'content-type')) setHeader(headers, 'Content-Type', mimeForPath(filePath));
          return { buffer };
        } catch (error) {
          throw new AppError('IO_ERROR', `Unable to read ${path.basename(filePath)}`, String(error));
        }
      }
      default:
        return {};
    }
  }

  private metaFrom(response: HttpResponseData, contentType: string): ResponseMeta {
    return {
      status: response.status,
      statusText: response.statusText,
      duration: response.durationMs,
      size: response.size,
      responseHeaders: response.headers,
      receivedAt: Date.now(),
      contentType
    };
  }

  private toResponseResult(
    requestId: string,
    response: HttpResponseData,
    stored: StoredBody,
    accumulation: ScriptAccumulator,
    runtime: RuntimeScopes,
    contentType: string
  ): ResponseResult {
    return {
      requestId,
      status: response.status,
      statusText: response.statusText,
      httpVersion: response.httpVersion,
      durationMs: response.durationMs,
      sizeBytes: response.size,
      headers: response.headers,
      contentType,
      charset: stored.charset,
      isBinary: stored.isBinary,
      truncated: response.truncated,
      bodyId: stored.bodyId,
      bodyText: stored.bodyText,
      bodyPreview: stored.bodyPreview,
      bodyTextLength: stored.bodyTextLength,
      imageDataUrl: stored.imageDataUrl,
      receivedAt: Date.now(),
      finalUrl: response.finalUrl,
      redirects: response.redirects,
      requestHeaders: response.requestHeaders,
      testResults: accumulation.tests,
      consoleLogs: accumulation.logs,
      environmentUpdates: accumulation.environmentUpdates,
      globalUpdates: accumulation.globalUpdates
    };
  }

  private recordFailureHistory(
    payload: SendRequestPayload,
    runtime: RuntimeScopes,
    limit: number
  ): void {
    try {
      this.deps.history.add(
        payload.request,
        {
          status: 0,
          statusText: 'Request failed',
          duration: 0,
          size: 0,
          responseHeaders: {},
          receivedAt: Date.now(),
          contentType: ''
        },
        runtime.environmentName,
        limit
      );
    } catch (error) {
      logger.warn('Unable to record failed request history', { error: String(error) });
    }
  }

  private safeHost(rawUrl: string): string {
    try {
      return new URL(normalizeUrl(rawUrl)).host;
    } catch {
      return '(invalid url)';
    }
  }
}
