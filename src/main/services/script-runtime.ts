/**
 * Source injected into the isolated VM context. It must not reference any host
 * function or object: everything is re-created inside the sandbox.
 */
export const SCRIPT_RUNTIME_SOURCE = String.raw`
const __pigeonState = {
  logs: [],
  tests: [],
  environment: Object.assign({}, __INPUT__.environment || {}),
  globals: Object.assign({}, __INPUT__.globals || {}),
  variables: Object.assign({}, __INPUT__.variables || {}),
  environmentUpdates: {},
  globalUpdates: {},
  localUpdates: {},
  request: {
    method: __INPUT__.request.method,
    url: __INPUT__.request.url,
    headers: (__INPUT__.request.headers || []).map(function (h) {
      return { key: h.key, value: h.value, disabled: !!h.disabled };
    }),
    body: __INPUT__.request.body || { mode: 'none', raw: '' }
  }
};

function __pigeonShow(value) {
  if (typeof value === 'string') return value.slice(0, 300);
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  try {
    var text = JSON.stringify(value);
    return text && text.length > 300 ? text.slice(0, 300) + '...' : String(text);
  } catch (error) {
    return String(value);
  }
}

function __pigeonLog(level, args) {
  if (__pigeonState.logs.length >= 300) return;
  var parts = [];
  for (var i = 0; i < args.length; i += 1) parts.push(__pigeonShow(args[i]));
  __pigeonState.logs.push({ level: level, message: parts.join(' '), timestamp: Date.now() });
}

globalThis.console = {
  log: function () { __pigeonLog('log', arguments); },
  info: function () { __pigeonLog('info', arguments); },
  warn: function () { __pigeonLog('warn', arguments); },
  error: function () { __pigeonLog('error', arguments); },
  debug: function () { __pigeonLog('debug', arguments); }
};

function __pigeonAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function __pigeonExpect(actual, negated) {
  var api = {};
  function check(condition, message) {
    var ok = negated ? !condition : condition;
    if (!ok) throw new Error((negated ? 'expected not: ' : '') + message);
  }
  api.equal = function (expected) {
    check(actual === expected, 'expected ' + __pigeonShow(actual) + ' to equal ' + __pigeonShow(expected));
    return api;
  };
  api.eql = function (expected) {
    check(__pigeonShow(actual) === __pigeonShow(expected),
      'expected ' + __pigeonShow(actual) + ' to deeply equal ' + __pigeonShow(expected));
    return api;
  };
  api.include = function (expected) {
    var ok = typeof actual === 'string' ? actual.indexOf(expected) >= 0
      : Array.isArray(actual) ? actual.indexOf(expected) >= 0
      : actual && typeof actual === 'object' ? Object.prototype.hasOwnProperty.call(actual, expected)
      : false;
    check(ok, 'expected ' + __pigeonShow(actual) + ' to include ' + __pigeonShow(expected));
    return api;
  };
  api.contain = api.include;
  api.property = function (name, expectedValue) {
    var has = actual !== null && actual !== undefined && name in Object(actual);
    check(has, 'expected ' + __pigeonShow(actual) + ' to have property ' + __pigeonShow(name));
    if (arguments.length > 1) {
      check(actual[name] === expectedValue,
        'expected property ' + name + ' to equal ' + __pigeonShow(expectedValue));
    }
    return api;
  };
  api.length = function (expected) {
    check(actual && actual.length === expected,
      'expected length ' + expected + ', got ' + __pigeonShow(actual && actual.length));
    return api;
  };
  api.lengthOf = api.length;
  api.above = function (expected) {
    check(actual > expected, 'expected ' + __pigeonShow(actual) + ' to be above ' + expected);
    return api;
  };
  api.greaterThan = api.above;
  api.below = function (expected) {
    check(actual < expected, 'expected ' + __pigeonShow(actual) + ' to be below ' + expected);
    return api;
  };
  api.lessThan = api.below;
  api.least = function (expected) {
    check(actual >= expected, 'expected ' + __pigeonShow(actual) + ' to be at least ' + expected);
    return api;
  };
  api.most = function (expected) {
    check(actual <= expected, 'expected ' + __pigeonShow(actual) + ' to be at most ' + expected);
    return api;
  };
  api.oneOf = function (values) {
    check(Array.isArray(values) && values.indexOf(actual) >= 0,
      'expected ' + __pigeonShow(actual) + ' to be one of ' + __pigeonShow(values));
    return api;
  };
  api.a = function (type) {
    var actualType = Array.isArray(actual) ? 'array' : typeof actual;
    check(actualType === type, 'expected ' + __pigeonShow(actual) + ' to be a ' + type);
    return api;
  };
  api.an = api.a;
  api.match = function (pattern) {
    check(pattern instanceof RegExp && pattern.test(String(actual)),
      'expected ' + __pigeonShow(actual) + ' to match ' + String(pattern));
    return api;
  };
  Object.defineProperties(api, {
    to: { get: function () { return api; } },
    be: { get: function () { return api; } },
    been: { get: function () { return api; } },
    is: { get: function () { return api; } },
    that: { get: function () { return api; } },
    which: { get: function () { return api; } },
    and: { get: function () { return api; } },
    has: { get: function () { return api; } },
    have: { get: function () { return api; } },
    at: { get: function () { return api; } },
    not: { get: function () { return __pigeonExpect(actual, !negated); } },
    exist: { get: function () { check(actual !== null && actual !== undefined, 'expected value to exist'); return api; } },
    empty: {
      get: function () {
        var isEmpty = actual == null || actual.length === 0 || Object.keys(Object(actual)).length === 0;
        check(isEmpty, 'expected value to be empty');
        return api;
      }
    },
    ok: { get: function () { check(!!actual, 'expected value to be truthy'); return api; } },
    true: { get: function () { check(actual === true, 'expected true'); return api; } },
    false: { get: function () { check(actual === false, 'expected false'); return api; } },
    null: { get: function () { check(actual === null, 'expected null'); return api; } },
    undefined: { get: function () { check(actual === undefined, 'expected undefined'); return api; } }
  });
  return api;
}

function __pigeonHeaderObject(headers) {
  var normalized = {};
  if (Array.isArray(headers)) {
    headers.forEach(function (h) { if (h && h.key) normalized[String(h.key).toLowerCase()] = h.value; });
  } else if (headers && typeof headers === 'object') {
    Object.keys(headers).forEach(function (key) {
      var value = headers[key];
      normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    });
  }
  return normalized;
}

var __responseHeaders = __pigeonHeaderObject(__INPUT__.response ? __INPUT__.response.headers : {});
var __responseText = __INPUT__.response ? String(__INPUT__.response.bodyText || '') : '';
var __responseJson;
var __responseJsonParsed = false;

function __pigeonResponseTo() {
  return {
    have: {
      status: function (code) {
        __pigeonAssert(__INPUT__.response && __INPUT__.response.status === code,
          'expected response status ' + code + ', got ' + (__INPUT__.response ? __INPUT__.response.status : 'none'));
      },
      header: function (name, value) {
        var key = String(name).toLowerCase();
        __pigeonAssert(Object.prototype.hasOwnProperty.call(__responseHeaders, key),
          'expected response to have header ' + name);
        if (arguments.length > 1) {
          __pigeonAssert(__responseHeaders[key] === value,
            'expected header ' + name + ' to equal ' + value);
        }
      },
      body: function (value) {
        __pigeonAssert(__responseText === value, 'expected response body to match');
      }
    }
  };
}

var pm = {
  info: {
    eventName: __INPUT__.eventName,
    requestName: __INPUT__.request.name,
    requestId: __INPUT__.request.id || ''
  },
  variables: {
    get: function (key) { return __pigeonState.variables[key]; },
    set: function (key, value) {
      __pigeonState.variables[String(key)] = String(value);
      __pigeonState.localUpdates[String(key)] = String(value);
    },
    unset: function (key) { delete __pigeonState.variables[key]; },
    has: function (key) { return Object.prototype.hasOwnProperty.call(__pigeonState.variables, key); },
    toObject: function () { return Object.assign({}, __pigeonState.variables); }
  },
  environment: {
    name: __INPUT__.environmentName || 'No environment',
    get: function (key) { return __pigeonState.environment[key]; },
    set: function (key, value) {
      __pigeonState.environment[String(key)] = String(value);
      __pigeonState.environmentUpdates[String(key)] = String(value);
    },
    unset: function (key) {
      delete __pigeonState.environment[key];
      __pigeonState.environmentUpdates[String(key)] = '';
    },
    has: function (key) { return Object.prototype.hasOwnProperty.call(__pigeonState.environment, key); },
    toObject: function () { return Object.assign({}, __pigeonState.environment); }
  },
  globals: {
    get: function (key) { return __pigeonState.globals[key]; },
    set: function (key, value) {
      __pigeonState.globals[String(key)] = String(value);
      __pigeonState.globalUpdates[String(key)] = String(value);
    },
    unset: function (key) {
      delete __pigeonState.globals[key];
      __pigeonState.globalUpdates[String(key)] = '';
    },
    has: function (key) { return Object.prototype.hasOwnProperty.call(__pigeonState.globals, key); },
    toObject: function () { return Object.assign({}, __pigeonState.globals); }
  },
  collectionVariables: null,
  request: null,
  response: null,
  expect: function (value) { return __pigeonExpect(value, false); },
  test: function (name, fn) {
    if (__pigeonState.tests.length >= 200) return;
    var started = Date.now();
    try {
      var result = fn();
      if (result && typeof result.then === 'function') {
        throw new Error('Async tests are not supported in this sandbox');
      }
      __pigeonState.tests.push({ name: String(name), passed: true, durationMs: Date.now() - started });
    } catch (error) {
      __pigeonState.tests.push({
        name: String(name),
        passed: false,
        error: error && error.message ? String(error.message) : String(error),
        durationMs: Date.now() - started
      });
    }
  },
  sendRequest: function () {
    throw new Error('pm.sendRequest is not supported in this build');
  }
};

pm.collectionVariables = pm.variables;
pm.request = __pigeonState.request;

var __urlObject = {
  raw: __pigeonState.request.url,
  toString: function () { return this.raw; },
  addQueryParams: function (input) {
    var pairs = [];
    if (typeof input === 'string') pairs = [input];
    else if (Array.isArray(input)) {
      pairs = input.map(function (entry) {
        if (typeof entry === 'string') return entry;
        return encodeURIComponent(entry.key) + '=' + encodeURIComponent(entry.value == null ? '' : entry.value);
      });
    } else if (input && typeof input === 'object') {
      pairs = Object.keys(input).map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(input[key]);
      });
    }
    if (!pairs.length) return;
    this.raw += (this.raw.indexOf('?') >= 0 ? '&' : '?') + pairs.join('&');
  }
};
pm.request.url = __urlObject;

var __requestHeaderList = __pigeonState.request.headers;
var __headerApi = {
  add: function (header) {
    var item = typeof header === 'string' ? { key: header, value: '' } : header;
    __requestHeaderList.push({ key: item.key, value: item.value == null ? '' : String(item.value), disabled: false });
  },
  upsert: function (header) {
    var item = typeof header === 'string' ? { key: header, value: '' } : header;
    var found = null;
    __requestHeaderList.forEach(function (entry) {
      if (String(entry.key).toLowerCase() === String(item.key).toLowerCase()) found = entry;
    });
    if (found) { found.value = String(item.value == null ? '' : item.value); found.disabled = false; }
    else __headerApi.add(item);
  },
  remove: function (key) {
    for (var i = __requestHeaderList.length - 1; i >= 0; i -= 1) {
      if (String(__requestHeaderList[i].key).toLowerCase() === String(key).toLowerCase()) {
        __requestHeaderList.splice(i, 1);
      }
    }
  },
  get: function (key) {
    var match = null;
    __requestHeaderList.forEach(function (entry) {
      if (!entry.disabled && String(entry.key).toLowerCase() === String(key).toLowerCase()) match = entry.value;
    });
    return match;
  },
  has: function (key) { return __headerApi.get(key) !== null; },
  all: function () { return __requestHeaderList.slice(); },
  toObject: function () {
    var result = {};
    __requestHeaderList.forEach(function (entry) {
      if (!entry.disabled && entry.key) result[entry.key] = entry.value;
    });
    return result;
  }
};
pm.request.headers = __headerApi;

var __bodyObject = {
  mode: __pigeonState.request.body ? __pigeonState.request.body.mode : 'none',
  raw: __pigeonState.request.body ? __pigeonState.request.body.raw : '',
  toString: function () { return this.raw || ''; }
};
pm.request.body = __bodyObject;

if (__INPUT__.response) {
  pm.response = {
    code: __INPUT__.response.status,
    status: __INPUT__.response.statusText,
    responseTime: __INPUT__.response.duration,
    responseSize: __INPUT__.response.size,
    headers: {
      get: function (name) { return __responseHeaders[String(name).toLowerCase()]; },
      has: function (name) { return Object.prototype.hasOwnProperty.call(__responseHeaders, String(name).toLowerCase()); },
      toObject: function () { return Object.assign({}, __responseHeaders); }
    },
    text: function () { return __responseText; },
    json: function () {
      if (!__responseJsonParsed) {
        __responseJson = JSON.parse(__responseText);
        __responseJsonParsed = true;
      }
      return __responseJson;
    },
    get to() { return __pigeonResponseTo(); }
  };
}

function __pigeonCollect() {
  var headers = [];
  __requestHeaderList.forEach(function (entry) {
    if (!entry.disabled && entry.key) headers.push({ key: String(entry.key), value: String(entry.value) });
  });
  return JSON.stringify({
    logs: __pigeonState.logs,
    tests: __pigeonState.tests,
    environmentUpdates: __pigeonState.environmentUpdates,
    globalUpdates: __pigeonState.globalUpdates,
    localUpdates: __pigeonState.localUpdates,
    request: {
      method: String(__pigeonState.request.method || 'GET'),
      url: String(__pigeonState.request.url),
      headers: headers,
      bodyRaw: __bodyObject.raw == null ? '' : String(__bodyObject.raw)
    }
  });
}
`;
