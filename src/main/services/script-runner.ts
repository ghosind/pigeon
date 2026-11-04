/**
 * Executes user scripts in an isolated Node VM context with no host bindings.
 * Data crosses the boundary as JSON and function results are serialized back.
 */
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import type { ConsoleLogEntry, ScriptTestResult } from '@shared/types';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { SCRIPT_RUNTIME_SOURCE } from './script-runtime';

const logger = createLogger('script-runner');

export interface ScriptResponseInput {
  status: number;
  statusText: string;
  headers: Record<string, string[]>;
  bodyText: string;
  duration: number;
  size: number;
}

export interface ScriptRequestInput {
  name: string;
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; disabled?: boolean }>;
  body: { mode: string; raw: string };
}

export interface ScriptExecutionInput {
  code: string;
  eventName: 'prerequest' | 'test';
  timeoutMs: number;
  request: ScriptRequestInput;
  response?: ScriptResponseInput;
  environment: Record<string, string>;
  globals: Record<string, string>;
  variables: Record<string, string>;
  environmentName: string;
}

export interface ScriptRequestMutation {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  bodyRaw: string;
}

export interface ScriptExecutionResult {
  logs: ConsoleLogEntry[];
  tests: ScriptTestResult[];
  environmentUpdates: Record<string, string>;
  globalUpdates: Record<string, string>;
  localUpdates: Record<string, string>;
  request?: ScriptRequestMutation;
  error?: string;
  timedOut: boolean;
}

interface SandboxOutput {
  logs: Array<{ level: ConsoleLogEntry['level']; message: string; timestamp: number }>;
  tests: ScriptTestResult[];
  environmentUpdates: Record<string, string>;
  globalUpdates: Record<string, string>;
  localUpdates: Record<string, string>;
  request: ScriptRequestMutation;
}

const EMPTY_OUTPUT: ScriptExecutionResult = {
  logs: [],
  tests: [],
  environmentUpdates: {},
  globalUpdates: {},
  localUpdates: {},
  timedOut: false
};

function isTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error && (error as { code?: string }).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT')
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ScriptRunner {
  run(input: ScriptExecutionInput): ScriptExecutionResult {
    if (!input.code.trim()) return { ...EMPTY_OUTPUT };

    const sandbox = Object.create(null) as Record<string, unknown>;
    const context = vm.createContext(sandbox, {
      name: `pigeon-${input.eventName}`,
      codeGeneration: { strings: false, wasm: false },
      microtaskMode: 'afterEvaluate'
    });
    const inputJson = JSON.stringify({
      eventName: input.eventName === 'prerequest' ? 'prerequest' : 'test',
      request: {
        name: input.request.name,
        method: input.request.method,
        url: input.request.url,
        headers: input.request.headers,
        body: input.request.body
      },
      response: input.response
        ? {
            status: input.response.status,
            statusText: input.response.statusText,
            headers: input.response.headers,
            bodyText: input.response.bodyText,
            duration: input.response.duration,
            size: input.response.size
          }
        : null,
      environment: input.environment,
      globals: input.globals,
      variables: input.variables,
      environmentName: input.environmentName
    });

    const bootstrap = `"use strict";\nconst __INPUT__ = JSON.parse(${JSON.stringify(inputJson)});\n${SCRIPT_RUNTIME_SOURCE}`;
    try {
      new vm.Script(bootstrap, { filename: 'pigeon-runtime.js' }).runInContext(context, { timeout: 2000 });
    } catch (error) {
      logger.error('Sandbox bootstrap failed', { error: errorMessage(error) });
      throw new AppError('SCRIPT_ERROR', 'The script sandbox could not be initialized', errorMessage(error));
    }

    let scriptError: string | undefined;
    let timedOut = false;
    try {
      new vm.Script(input.code, { filename: `pigeon-${input.eventName}.js` }).runInContext(context, {
        timeout: Math.max(100, Math.min(input.timeoutMs, 30000))
      });
    } catch (error) {
      timedOut = isTimeout(error);
      scriptError = timedOut
        ? `Script timed out after ${input.timeoutMs}ms`
        : errorMessage(error);
      logger.warn('User script threw', { eventName: input.eventName, timedOut, error: scriptError });
    }

    let output: SandboxOutput;
    try {
      const raw = vm.runInContext('__pigeonCollect()', context, { timeout: 2000 }) as string;
      output = JSON.parse(raw) as SandboxOutput;
    } catch (error) {
      logger.error('Unable to collect sandbox output', { error: errorMessage(error) });
      return {
        ...EMPTY_OUTPUT,
        error: scriptError ?? 'Unable to collect script output',
        timedOut
      };
    }

    return {
      logs: (output.logs ?? []).slice(0, 300).map((entry) => ({
        id: randomUUID(),
        level: entry.level,
        message: String(entry.message).slice(0, 4000),
        timestamp: entry.timestamp || Date.now(),
        scope: input.eventName === 'prerequest' ? 'pre-request' : 'test'
      })),
      tests: Array.isArray(output.tests) ? output.tests.slice(0, 200) : [],
      environmentUpdates: output.environmentUpdates ?? {},
      globalUpdates: output.globalUpdates ?? {},
      localUpdates: output.localUpdates ?? {},
      request: output.request,
      error: scriptError,
      timedOut
    };
  }
}
