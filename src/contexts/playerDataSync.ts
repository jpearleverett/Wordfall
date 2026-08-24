/**
 * playerDataSync.ts — pure decision helpers for PlayerContext's hydration
 * and cloud-sync paths, extracted to a .ts module so they stay unit-testable
 * (jest in this repo cannot load .tsx providers — see playerSyncGuards.test).
 *
 * Three decision points, each of which once destroyed player state when it
 * went wrong inline:
 *
 * 1. `hydratePlayerData` — both hydration paths were shallow spreads, so a
 *    save written before a nested field existed (collections.atlasWordMastery,
 *    mysteryWheel.jackpotPity, …) replaced the parent object wholesale and
 *    left the new field undefined — a TypeError on the first code path that
 *    indexed into it.
 * 2. `chooseSnapshot` — the initial-pull merge was whole-blob last-write-wins
 *    on wall clock, and a fresh install (or failed hydration) could stamp its
 *    defaults `lastModified = Date.now()` — so level-1 defaults beat the
 *    level-300 cloud save and were then pushed over it.
 * 3. `reconcileDiscoveredClub` — the once-per-open membership discovery
 *    applied its answer unconditionally, so a join that completed while the
 *    query was in flight was wiped by the stale pre-join `null`.
 */

/**
 * Merge a stored (possibly older-schema) save over the given base so nested
 * fields added to the schema after the save was written hydrate to their
 * defaults instead of undefined. Arrays and scalars come from the stored
 * side wholesale; plain objects merge recursively.
 */
export function hydratePlayerData<T extends object>(
  base: T,
  stored: Partial<T>,
): T {
  return deepMerge(
    base as unknown as Record<string, unknown>,
    stored as Record<string, unknown>,
  ) as unknown as T;
}

/**
 * Decide between the hydrated local snapshot and the cloud doc on the
 * initial pull. Last-write-wins on the lastModified wall-clock stamp, with
 * one guard in each direction: a default-shaped snapshot (zero puzzles
 * solved — a fresh install, failed hydration, or a defaults doc a past bug
 * wrote) never beats a snapshot with real progress, whatever the stamps
 * say. Stamps on a fresh device are meaningless; progress is not.
 * An adopted cloud doc is deep-hydrated over `defaults` so older-schema
 * docs gain newly-added nested fields.
 */
export function chooseSnapshot<
  T extends { lastModified?: number; puzzlesSolved?: number },
>(local: T, cloud: Partial<T>, defaults: T): T {
  const localModified = local.lastModified || 0;
  const cloudModified = cloud.lastModified || 0;
  const localHasProgress = (local.puzzlesSolved || 0) > 0;
  const cloudHasProgress = (cloud.puzzlesSolved || 0) > 0;

  if (cloudHasProgress && !localHasProgress) {
    return hydratePlayerData(defaults, cloud);
  }
  if (localHasProgress && !cloudHasProgress) {
    return local;
  }
  if (cloudModified > localModified) {
    return hydratePlayerData(defaults, cloud);
  }
  return local;
}

/**
 * Decide whether the once-per-open club-membership discovery result may be
 * applied. `undefined` means the query couldn't check (offline) and
 * `mutatedSinceQueryStart` means a joinClub/leaveClub callable completed
 * while the query was in flight — in both cases the local cache is fresher
 * than the answer and must be kept (a stale pre-join `null` would wipe a
 * just-joined club for the rest of the session). Genuine cross-device
 * changes still reconcile on the next app open via a clean query.
 */
export function reconcileDiscoveredClub(
  discovered: { id?: unknown } | null | undefined,
  mutatedSinceQueryStart: boolean,
): { apply: false } | { apply: true; clubId: string | null } {
  if (discovered === undefined) return { apply: false };
  if (mutatedSinceQueryStart) return { apply: false };
  return { apply: true, clubId: discovered ? (discovered.id as string) : null };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}
