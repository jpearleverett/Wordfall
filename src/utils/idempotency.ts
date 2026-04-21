/**
 * Generates a short idempotency key for deduplicating server-side callable
 * invocations (gifts, puzzle completion, etc.). Not cryptographically strong —
 * uniqueness is only required per sender/app-install within a day, which the
 * server's dedup doc enforces.
 */
export function generateIdempotencyKey(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}
