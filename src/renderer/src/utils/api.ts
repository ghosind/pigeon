import type { ApiError, ApiResult } from '@shared/types';

export class ApiCallError extends Error {
  readonly code: ApiError['code'];
  readonly details?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiCallError';
    this.code = error.code;
    this.details = error.details;
  }
}

export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new ApiCallError(result.error);
  return result.data;
}

export function asApiCallError(error: unknown): ApiCallError {
  if (error instanceof ApiCallError) return error;
  if (error instanceof Error) {
    return new ApiCallError({ code: 'UNKNOWN', message: error.message });
  }
  return new ApiCallError({ code: 'UNKNOWN', message: String(error) });
}
