import { ZodError } from 'zod';
import type { ApiError, ApiErrorCode } from '@shared/types';

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: string;

  constructor(code: ApiErrorCode, message: string, details?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Converts any thrown value into a serializable IPC error. */
export function toApiError(error: unknown): ApiError {
  if (isAppError(error)) {
    return { code: error.code, message: error.message, details: error.details };
  }
  if (error instanceof ZodError) {
    const summary = error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
      .join('; ');
    return { code: 'VALIDATION_ERROR', message: `Invalid request: ${summary}` };
  }
  if (error instanceof Error) {
    const code: ApiErrorCode = error.name === 'AbortError' ? 'REQUEST_CANCELLED' : 'UNKNOWN';
    return { code, message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}

export function notFound(what: string): AppError {
  return new AppError('NOT_FOUND', `${what} was not found`);
}
