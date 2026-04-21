/**
 * Runtime validator for remote chapter payloads.
 *
 * Seasonal content is published via a Remote Config JSON string so Ops
 * can ship new chapters (id 41+) without a client rebuild. Because the
 * payload comes from outside the type system, the client must
 * validate before consuming — a malformed blob should log, be
 * discarded, and fall through to the static 40-chapter catalog
 * rather than crash.
 *
 * Intentionally hand-rolled (no zod dep) so the seasonal pipeline
 * doesn't pull another runtime into the bundle. The shape is narrow
 * enough that a ~40-line checker reads cleanly.
 */
import type { Chapter, Difficulty } from '../types';

const DIFFICULTIES: ReadonlyArray<Difficulty> = ['easy', 'medium', 'hard', 'expert'];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 120;
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function isThemeWordArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 100 &&
    v.every((w) => typeof w === 'string' && /^[a-zA-Z]{2,12}$/.test(w))
  );
}

function isValidChapter(raw: unknown): raw is Chapter {
  if (!raw || typeof raw !== 'object') return false;
  const c = raw as Record<string, unknown>;
  return (
    isNonNegativeInt(c.id) &&
    (c.id as number) >= 41 && // Overlay chapters start AFTER the static catalog.
    (c.id as number) <= 9999 &&
    isNonEmptyString(c.name) &&
    isNonEmptyString(c.theme) &&
    isNonEmptyString(c.description) &&
    isNonNegativeInt(c.puzzleCount) &&
    (c.puzzleCount as number) >= 1 &&
    (c.puzzleCount as number) <= 50 &&
    isNonNegativeInt(c.requiredStars) &&
    typeof c.difficulty === 'string' &&
    DIFFICULTIES.includes(c.difficulty as Difficulty) &&
    isThemeWordArray(c.themeWords) &&
    isNonEmptyString(c.wingId) &&
    isNonEmptyString(c.icon)
  );
}

/**
 * Parse and validate an RC-published chapter-overlay JSON string.
 * Returns the valid chapter array, or [] on any error. Never throws.
 *
 * Accepts either a top-level array or a `{ chapters: [...] }` wrapper
 * so Ops can add metadata fields (version, notes) alongside the data
 * without breaking the parser.
 */
export function parseRemoteChapters(json: string | null | undefined): Chapter[] {
  if (!json || typeof json !== 'string' || json.trim().length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { chapters?: unknown })?.chapters)
    ? ((parsed as { chapters: unknown[] }).chapters)
    : [];
  const out: Chapter[] = [];
  const seenIds = new Set<number>();
  for (const c of candidates) {
    if (!isValidChapter(c)) continue;
    if (seenIds.has(c.id)) continue; // Discard duplicates silently.
    seenIds.add(c.id);
    out.push(c);
  }
  return out.sort((a, b) => a.id - b.id);
}
