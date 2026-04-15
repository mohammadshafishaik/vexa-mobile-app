export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}
