import type { AppError, ErrorCode } from './types';

/** Same as the old aiErr(code, message): an Error with a .code */
export function appError(code: ErrorCode, msg?: string, text?: string): AppError {
  const e = new Error(msg || code) as AppError;
  e.code = code;
  if (text != null) e.text = text;
  return e;
}
