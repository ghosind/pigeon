import { describe, expect, it } from 'vitest';
import { ScriptRunner, type ScriptExecutionInput } from '../src/main/services/script-runner';

const runner = new ScriptRunner();

function input(overrides: Partial<ScriptExecutionInput>): ScriptExecutionInput {
  return {
    code: '',
    eventName: 'test',
    timeoutMs: 1000,
    request: {
      name: 'Test',
      method: 'GET',
      url: 'https://api.test/users',
      headers: [{ key: 'Accept', value: 'application/json' }],
      body: { mode: 'none', raw: '' }
    },
    environment: { token: 'abc' },
    globals: { region: 'us' },
    variables: {},
    environmentName: 'Test env',
    ...overrides
  };
}

describe('script sandbox', () => {
  it('runs pg.test assertions and captures console output', () => {
    const result = runner.run(
      input({
        code: [
          'pg.test("status", () => pg.response.to.have.status(200));',
          'pg.test("json", () => pg.expect(pg.response.json()).to.have.property("ok"));',
          'console.log("token is", pg.environment.get("token"));'
        ].join('\n'),
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': ['application/json'] },
          bodyText: '{"ok":true}',
          duration: 12,
          size: 11
        }
      })
    );
    expect(result.tests).toHaveLength(2);
    expect(result.tests.every((test) => test.passed)).toBe(true);
    expect(result.logs[0].message).toContain('abc');
  });

  it('captures failing assertions with messages', () => {
    const result = runner.run(
      input({
        code: 'pg.test("fails", () => pg.expect(1).to.equal(2));',
        response: { status: 500, statusText: 'ERR', headers: {}, bodyText: '', duration: 1, size: 0 }
      })
    );
    expect(result.tests[0].passed).toBe(false);
    expect(result.tests[0].error).toContain('expected');
  });

  it('collects variable and header mutations', () => {
    const result = runner.run(
      input({
        eventName: 'prerequest',
        code: [
          'pg.environment.set("baseUrl", "https://new.test");',
          'pg.globals.set("region", "eu");',
          'pg.variables.set("local", "1");',
          'pg.request.headers.upsert({ key: "X-Debug", value: "yes" });'
        ].join('\n')
      })
    );
    expect(result.environmentUpdates.baseUrl).toBe('https://new.test');
    expect(result.globalUpdates.region).toBe('eu');
    expect(result.localUpdates.local).toBe('1');
    expect(result.request?.headers).toContainEqual({ key: 'X-Debug', value: 'yes' });
  });

  it('keeps pm as a Postman-compatible alias for pg', () => {
    const result = runner.run(
      input({
        code: 'pm.test("alias", () => pm.expect(pm.environment.get("token")).to.equal("abc"));'
      })
    );
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].passed).toBe(true);
  });

  it('does not expose Node globals or code generation', () => {
    const result = runner.run(
      input({
        code: [
          'console.log(typeof require, typeof process, typeof Buffer);',
          'try { this.constructor.constructor("return process")(); } catch (e) { console.log("escaped: no"); }'
        ].join('\n')
      })
    );
    expect(result.logs[0].message).toBe('undefined undefined undefined');
    expect(result.logs.some((log) => log.message === 'escaped: no')).toBe(true);
  });

  it('terminates infinite loops', () => {
    const result = runner.run(input({ code: 'while (true) {}', timeoutMs: 120 }));
    expect(result.timedOut).toBe(true);
    expect(result.error).toContain('timed out');
  });

  it('reports syntax errors without crashing the process', () => {
    const result = runner.run(input({ code: 'pg.test("x", () => {' }));
    expect(result.error).toBeTruthy();
  });
});
