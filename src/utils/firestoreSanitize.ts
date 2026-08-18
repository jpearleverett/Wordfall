/**
 * Strip `undefined` values from a plain-data payload before handing it to
 * Firestore.
 *
 * `setDoc` / `updateDoc` REJECT any nested `undefined` unless the app opts
 * into `ignoreUndefinedProperties` (this app does not), and they reject it by
 * throwing — which, behind a fire-and-forget persist queue, means the write
 * is silently dropped. That is precisely what happened when
 * `streaks.lastGraceDate` was introduced: an optional field hydrated as
 * `undefined` for every existing player and cloud saves stopped dead, with
 * nothing but a warn log to show for it.
 *
 * The producing code should never materialize `undefined` values in persisted
 * state (JSON.stringify drops them for AsyncStorage, so local and cloud would
 * diverge anyway). This function exists because "should never" has already
 * failed once: it makes the WRITE BOUNDARY safe against the whole class,
 * including fields nobody has added yet.
 *
 * Only plain objects and arrays are recursed into; anything else (including
 * class instances, which have their own Firestore handling or none) passes
 * through untouched. `null` is preserved — Firestore accepts null, and
 * null-vs-absent is a meaningful distinction to callers.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    // Arrays keep their length: an undefined ELEMENT becomes null rather
    // than being dropped, because index positions can be meaningful and
    // Firestore cannot represent a hole either way.
    return value.map((entry) =>
      entry === undefined ? null : stripUndefinedDeep(entry),
    ) as unknown as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      out[key] = stripUndefinedDeep(entry);
    }
    return out as T;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
