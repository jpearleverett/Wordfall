/**
 * Cloud-sync + hydration guard rails for PlayerContext (via the pure
 * helpers in src/contexts/playerDataSync.ts — the provider itself cannot
 * be rendered in this environment).
 *
 * Three decision points, each of which once destroyed player state:
 *
 * 1. chooseSnapshot — the initial-pull merge was whole-blob last-write-wins
 *    on wall clock, and a fresh install (or failed hydration) stamped its
 *    defaults `lastModified = Date.now()` before the pull ever ran — so the
 *    level-1 defaults beat the level-300 cloud save and were pushed over
 *    it. The guard: a default-shaped snapshot (zero puzzles solved) never
 *    beats one with real progress, in either direction, whatever the
 *    stamps say.
 *
 * 2. hydratePlayerData — both hydration paths were shallow spreads, so a
 *    save written before a nested field existed (collections.
 *    atlasWordMastery, mysteryWheel.jackpotPity, …) replaced the parent
 *    object wholesale and left the new field undefined — a TypeError on
 *    the first code path that indexed into it (collectAtlasWord's
 *    duplicate-word branch).
 *
 * 3. reconcileDiscoveredClub — the once-per-open membership discovery
 *    applied its answer unconditionally, so a join that completed while
 *    the query was in flight (club_invite deep link at app open, query
 *    served from Firestore's offline cache) was wiped by the stale
 *    pre-join `null` for the rest of the session.
 */
import {
  chooseSnapshot,
  hydratePlayerData,
  reconcileDiscoveredClub,
} from '../contexts/playerDataSync';

// Representative slice of PlayerData: the fields the sync decisions read,
// plus the nested shapes the shallow-hydration bug corrupted.
interface Fixture {
  currentLevel: number;
  puzzlesSolved: number;
  totalStars: number;
  restoredWings: string[];
  collections: {
    atlasPages: Record<string, string[]>;
    atlasWordMastery: Record<string, number>;
    rareTiles: Record<string, number>;
    wildcardTiles: number;
    seasonalStamps: Record<string, number[]>;
  };
  mysteryWheel: {
    spinsAvailable: number;
    puzzlesSinceLastSpin: number;
    puzzlesPerFreeSpin: number;
    jackpotPity: number;
  };
  streaks: {
    currentStreak: number;
    bestStreak: number;
    lastPlayDate: string;
    graceDaysUsed: number;
  };
  tutorialComplete: boolean;
  lastModified: number;
}

const DEFAULTS: Fixture = {
  currentLevel: 1,
  puzzlesSolved: 0,
  totalStars: 0,
  restoredWings: [],
  collections: {
    atlasPages: {},
    atlasWordMastery: {},
    rareTiles: {},
    wildcardTiles: 0,
    seasonalStamps: {},
  },
  mysteryWheel: {
    spinsAvailable: 1,
    puzzlesSinceLastSpin: 0,
    puzzlesPerFreeSpin: 5,
    jackpotPity: 25,
  },
  streaks: { currentStreak: 0, bestStreak: 0, lastPlayDate: '', graceDaysUsed: 0 },
  tutorialComplete: false,
  lastModified: 0,
};

const snapshot = (over: Partial<Fixture>): Fixture =>
  hydratePlayerData(DEFAULTS, over);

describe('chooseSnapshot', () => {
  const populatedCloud: Partial<Fixture> = {
    currentLevel: 300,
    puzzlesSolved: 800,
    totalStars: 700,
    lastModified: 1_000,
  };

  it('default-shaped local with a FRESHER stamp still loses to a populated cloud save', () => {
    // The clobber scenario: failed hydration / reinstall stamped the
    // defaults Date.now() before the pull ever succeeded.
    const local = snapshot({ lastModified: 9_000_000_000_000 });
    const chosen = chooseSnapshot(local, populatedCloud, DEFAULTS);
    expect(chosen.currentLevel).toBe(300);
    expect(chosen.puzzlesSolved).toBe(800);
  });

  it('populated local survives a default-shaped cloud doc with a fresher stamp', () => {
    // Symmetric guard: a defaults doc a past clobber wrote must not wipe
    // real local progress on the next device.
    const local = snapshot({ currentLevel: 120, puzzlesSolved: 350, lastModified: 1_000 });
    const chosen = chooseSnapshot(
      local,
      { puzzlesSolved: 0, lastModified: 9_000_000_000_000 },
      DEFAULTS,
    );
    expect(chosen.currentLevel).toBe(120);
    expect(chosen.puzzlesSolved).toBe(350);
  });

  it('falls back to last-write-wins when both sides have real progress', () => {
    const local = snapshot({ currentLevel: 50, puzzlesSolved: 100, lastModified: 2_000 });
    expect(chooseSnapshot(local, populatedCloud, DEFAULTS).currentLevel).toBe(50); // local fresher
    const staleLocal = snapshot({ currentLevel: 50, puzzlesSolved: 100, lastModified: 500 });
    expect(chooseSnapshot(staleLocal, populatedCloud, DEFAULTS).currentLevel).toBe(300); // cloud fresher
  });

  it('keeps local when neither side has progress and stamps tie at zero', () => {
    const local = snapshot({});
    expect(chooseSnapshot(local, { lastModified: 0 }, DEFAULTS)).toBe(local);
  });

  it('deep-hydrates an adopted cloud doc written by an older schema', () => {
    const oldSchemaCloud = {
      ...populatedCloud,
      // collections written before atlasWordMastery existed
      collections: { atlasPages: { p1: ['CASTLE'] }, rareTiles: { Q: 2 } },
    } as unknown as Partial<Fixture>;
    const chosen = chooseSnapshot(snapshot({}), oldSchemaCloud, DEFAULTS);
    expect(chosen.collections.atlasPages).toEqual({ p1: ['CASTLE'] });
    expect(chosen.collections.rareTiles).toEqual({ Q: 2 });
    // The missing nested map hydrates to its default instead of undefined.
    expect(chosen.collections.atlasWordMastery).toEqual({});
  });
});

describe('hydratePlayerData', () => {
  it('fills nested fields the stored save predates, keeping stored values', () => {
    const stored = {
      puzzlesSolved: 42,
      collections: { atlasPages: {}, rareTiles: { Z: 1 }, wildcardTiles: 3 },
      mysteryWheel: { spinsAvailable: 4, puzzlesSinceLastSpin: 2 },
      streaks: { currentStreak: 9, bestStreak: 12, lastPlayDate: '2026-08-20' },
    } as unknown as Partial<Fixture>;

    const hydrated = hydratePlayerData(DEFAULTS, stored);

    // Stored values survive
    expect(hydrated.puzzlesSolved).toBe(42);
    expect(hydrated.collections.rareTiles).toEqual({ Z: 1 });
    expect(hydrated.collections.wildcardTiles).toBe(3);
    expect(hydrated.mysteryWheel.spinsAvailable).toBe(4);
    expect(hydrated.streaks.currentStreak).toBe(9);

    // Missing nested fields hydrate to defaults, not undefined
    expect(hydrated.collections.atlasWordMastery).toEqual({});
    expect(hydrated.collections.seasonalStamps).toEqual({});
    expect(hydrated.mysteryWheel.jackpotPity).toBe(25);
    expect(hydrated.mysteryWheel.puzzlesPerFreeSpin).toBe(5);
    expect(hydrated.streaks.graceDaysUsed).toBe(0);

    // The exact crash path from the finding: collectAtlasWord's duplicate
    // branch indexes atlasWordMastery — must not throw.
    expect(hydrated.collections.atlasWordMastery['CASTLE'] ?? 1).toBe(1);
  });

  it('does not resurrect defaults over explicit falsy stored values', () => {
    const hydrated = hydratePlayerData(DEFAULTS, {
      mysteryWheel: { ...DEFAULTS.mysteryWheel, spinsAvailable: 0 },
      tutorialComplete: true,
    });
    expect(hydrated.mysteryWheel.spinsAvailable).toBe(0);
    expect(hydrated.tutorialComplete).toBe(true);
  });

  it('replaces arrays wholesale (no index-wise merging)', () => {
    const hydrated = hydratePlayerData(
      { ...DEFAULTS, restoredWings: ['a', 'b', 'c'] },
      { restoredWings: ['d'] },
    );
    expect(hydrated.restoredWings).toEqual(['d']);
  });
});

describe('reconcileDiscoveredClub', () => {
  it('keeps the cache when the query could not check (offline)', () => {
    expect(reconcileDiscoveredClub(undefined, false)).toEqual({ apply: false });
  });

  it('keeps the cache when a join/leave landed while the query was in flight', () => {
    // The deep-link race: joinClubSecure set the clubId, then the stale
    // pre-join query answer (null) resolved. It must not clear the join.
    expect(reconcileDiscoveredClub(null, true)).toEqual({ apply: false });
    expect(reconcileDiscoveredClub({ id: 'abc' }, true)).toEqual({ apply: false });
  });

  it('applies the discovered answer when nothing raced it', () => {
    expect(reconcileDiscoveredClub({ id: 'abc' }, false)).toEqual({
      apply: true,
      clubId: 'abc',
    });
    // Cross-device leave reconciliation stays possible on a clean query.
    expect(reconcileDiscoveredClub(null, false)).toEqual({ apply: true, clubId: null });
  });
});
