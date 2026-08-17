/**
 * THE WRITE BOUNDARY MUST BE UNDEFINED-PROOF.
 *
 * Firestore's setDoc throws on any nested `undefined` (the app does not
 * enable ignoreUndefinedProperties), and both the player and economy payloads
 * are written from fire-and-forget persist queues — so the throw is a
 * silently dropped save, forever, with only a warn log.
 *
 * This is not hypothetical: adding the optional `streaks.lastGraceDate`
 * field wrote `undefined` under it for every player who had never used a
 * grace day, which stopped every cloud save on this branch until caught by
 * the defect sweep. The producing code is fixed to omit the key, and
 * stripUndefinedDeep guards the boundary against the whole class — including
 * optional fields nobody has added yet.
 */
import { stripUndefinedDeep } from '../firestoreSanitize';

describe('stripUndefinedDeep', () => {
  it('drops object keys whose value is undefined, at any depth', () => {
    const input = {
      a: 1,
      b: undefined,
      nested: { c: 'x', d: undefined, deeper: { e: undefined, f: 0 } },
    };
    expect(stripUndefinedDeep(input)).toEqual({
      a: 1,
      nested: { c: 'x', deeper: { f: 0 } },
    });
  });

  it('preserves null — null and absent are different answers', () => {
    const input = { cleared: null, nested: { alsoNull: null } };
    expect(stripUndefinedDeep(input)).toEqual(input);
  });

  it('keeps array length, converting undefined elements to null', () => {
    // Index positions can be meaningful, and Firestore cannot represent a
    // hole; collapsing the array would silently shift every later element.
    const input = { list: [1, undefined, 3] as Array<number | undefined> };
    expect(stripUndefinedDeep(input)).toEqual({ list: [1, null, 3] });
  });

  it('recurses through arrays of objects', () => {
    const input = { rows: [{ keep: 1, drop: undefined }, { keep: 2 }] };
    expect(stripUndefinedDeep(input)).toEqual({ rows: [{ keep: 1 }, { keep: 2 }] });
  });

  it('passes primitives and non-plain objects through untouched', () => {
    expect(stripUndefinedDeep(42)).toBe(42);
    expect(stripUndefinedDeep('s')).toBe('s');
    expect(stripUndefinedDeep(false)).toBe(false);
    const date = new Date(0);
    // Not a plain object — Firestore has its own handling for Date; mangling
    // it into {} would corrupt the payload far worse than undefined does.
    expect(stripUndefinedDeep(date)).toBe(date);
  });

  it('produces output setDoc would accept: no undefined anywhere', () => {
    // The property the whole module exists for, checked structurally on a
    // shape mimicking the real player payload.
    const payload = {
      streaks: {
        currentStreak: 3,
        lastGraceDate: undefined,
        recentBreak: null,
      },
      collections: { rareTiles: {}, wildcardTiles: undefined },
      pendingCeremonies: [{ type: 'first_win', data: { x: undefined } }],
    };
    const clean = stripUndefinedDeep(payload);

    const hasUndefined = (value: unknown): boolean => {
      if (value === undefined) return true;
      if (Array.isArray(value)) return value.some(hasUndefined);
      if (value !== null && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(hasUndefined);
      }
      return false;
    };
    expect(hasUndefined(clean)).toBe(false);
    // And the meaningful data survived.
    expect((clean as typeof payload).streaks.currentStreak).toBe(3);
  });

  it('round-trips like JSON, so local (AsyncStorage) and cloud stay in agreement', () => {
    // AsyncStorage persists via JSON.stringify, which drops undefined keys.
    // The sanitizer must make the SAME choice, or the two stores diverge on
    // exactly the fields that caused the original bug.
    const payload = { a: 1, b: undefined, nested: { c: undefined, d: 'x' } };
    expect(stripUndefinedDeep(payload)).toEqual(JSON.parse(JSON.stringify(payload)));
  });
});
