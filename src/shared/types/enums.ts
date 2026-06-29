// =========================================================================
// Shared enums used across all types
// =========================================================================

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export enum BodyMode {
  None = 'none',
  FormData = 'formdata',
  UrlEncoded = 'urlencoded',
  Raw = 'raw',
  Binary = 'binary'
}

export enum RawType {
  JSON = 'json',
  XML = 'xml',
  Text = 'text',
  HTML = 'html'
}

export enum AuthType {
  None = 'none',
  Basic = 'basic',
  Bearer = 'bearer'
}

export enum ItemType {
  Text = 'text',
  File = 'file'
}

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}
