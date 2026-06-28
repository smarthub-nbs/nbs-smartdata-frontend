import { ApiError } from '@app/core/models/api-error.model';

/** Maps backend validation field keys (snake_case) to form field keys. */
export function fieldErrorsFromApi(
  error: unknown,
  keyMap: Record<string, string> = {},
): Record<string, string> {
  if (!(error instanceof ApiError)) {
    return {};
  }

  const body = error.body;
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return {};
  }

  const envelope = body as {
    error?: { details?: { fields?: Record<string, string[]> } };
  };
  const fields = envelope.error?.details?.fields;
  if (!fields) {
    return {};
  }

  const mapped: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fields)) {
    const target = keyMap[key] ?? key;
    const message = messages.find((item) => item.trim().length > 0);
    if (message) {
      mapped[target] = message;
    }
  }
  return mapped;
}
