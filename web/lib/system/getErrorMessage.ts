type MaybeError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} | null | undefined;

export function getErrorMessage(
  error: MaybeError,
  fallback = "Errore sconosciuto."
) {
  if (!error) {
    return null;
  }

  const parts = [
    error.message,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
    error.code ? `Code: ${error.code}` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return fallback;
  }

  return parts.join(" | ");
}

export function hasAnyError(...errors: MaybeError[]) {
  return errors.some(Boolean);
}