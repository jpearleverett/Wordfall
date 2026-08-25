/**
 * Club-vs-club weekly leaderboard read (leaderboards/clubs_weekly).
 *
 * ClubScreen used to render a HARDCODED mock top-5 ("Word Warriors",
 * "Lexicon Lords"...) whenever the club doc carried no entries — which was
 * always, because nothing read the real snapshot `updateClubLeaderboard`
 * writes server-side. These tests pin the real read's contract:
 *
 *  - entries[]  → snapshot read (possibly genuinely empty this week)
 *  - null       → offline / disabled / read error (screen shows a neutral
 *                 state, never fabricated clubs)
 *  - malformed rows filtered, capped at 10, memberCount enriched
 *    best-effort from the club docs (a failed enrich keeps the ranking).
 */

let mockConfigured = true;
jest.mock('../../config/firebase', () => ({
  get isFirebaseConfigured() {
    return mockConfigured;
  },
  db: {},
}));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ name })),
  doc: jest.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: jest.fn((...parts: unknown[]) => ({ parts })),
  where: jest.fn((...args: unknown[]) => ({ where: args })),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
  onSnapshot: jest.fn(() => () => {}),
  increment: jest.fn((n: number) => n),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
  runTransaction: jest.fn(),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  documentId: jest.fn(() => '__name__'),
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/app', () => ({}), { virtual: true });

import { firestoreService } from '../firestore';

const SNAPSHOT_ENTRIES = [
  { clubId: 'club_a', name: 'Alpha', score: 4200, rank: 1, tier: 'diamond' },
  { clubId: 'club_b', name: 'Beta', score: 1800, rank: 2, tier: 'gold' },
];

function snapshotDoc(data: unknown, exists = true) {
  return { exists: () => exists, data: () => data };
}

function clubDocs(counts: Record<string, number>) {
  return {
    docs: Object.entries(counts).map(([id, memberCount]) => ({
      id,
      data: () => ({ memberCount }),
    })),
  };
}

describe('firestoreService.getClubsWeeklyLeaderboard', () => {
  beforeEach(() => {
    mockConfigured = true;
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
  });

  it('returns null when firebase is not configured (offline-unknown, not empty)', async () => {
    mockConfigured = false;
    expect(await firestoreService.getClubsWeeklyLeaderboard()).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('reads the snapshot and enriches memberCount from the club docs', async () => {
    mockGetDoc.mockResolvedValue(snapshotDoc({ entries: SNAPSHOT_ENTRIES }));
    mockGetDocs.mockResolvedValue(clubDocs({ club_a: 12, club_b: 7 }));

    const rows = await firestoreService.getClubsWeeklyLeaderboard();
    expect(rows).toEqual([
      { clubId: 'club_a', name: 'Alpha', score: 4200, rank: 1, tier: 'diamond', memberCount: 12 },
      { clubId: 'club_b', name: 'Beta', score: 1800, rank: 2, tier: 'gold', memberCount: 7 },
    ]);
  });

  it('returns [] for a missing snapshot doc (no scores this week — honest empty)', async () => {
    mockGetDoc.mockResolvedValue(snapshotDoc(undefined, false));
    expect(await firestoreService.getClubsWeeklyLeaderboard()).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('returns [] when entries is missing or not an array', async () => {
    mockGetDoc.mockResolvedValue(snapshotDoc({ entries: 'oops' }));
    expect(await firestoreService.getClubsWeeklyLeaderboard()).toEqual([]);
    mockGetDoc.mockResolvedValue(snapshotDoc({}));
    expect(await firestoreService.getClubsWeeklyLeaderboard()).toEqual([]);
  });

  it('returns null when the read throws (network) — never fabricated entries', async () => {
    mockGetDoc.mockRejectedValue(new Error('unavailable'));
    expect(await firestoreService.getClubsWeeklyLeaderboard()).toBeNull();
  });

  it('filters malformed rows, defaults unknown tiers, and caps at 10', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      clubId: `club_${i}`,
      name: `Club ${i}`,
      score: 1000 - i,
      rank: i + 1,
      tier: i === 0 ? 'platinum' : 'silver', // unknown tier → bronze
    }));
    mockGetDoc.mockResolvedValue(
      snapshotDoc({ entries: [null, 42, { name: 'no id' }, ...many] }),
    );
    mockGetDocs.mockResolvedValue(clubDocs({}));

    const rows = await firestoreService.getClubsWeeklyLeaderboard();
    expect(rows).toHaveLength(10);
    expect(rows![0]).toMatchObject({ clubId: 'club_0', tier: 'bronze' });
    expect(rows!.every((r) => typeof r.clubId === 'string')).toBe(true);
  });

  it('keeps the ranking when the memberCount enrich query fails', async () => {
    mockGetDoc.mockResolvedValue(snapshotDoc({ entries: SNAPSHOT_ENTRIES }));
    mockGetDocs.mockRejectedValue(new Error('index missing'));

    const rows = await firestoreService.getClubsWeeklyLeaderboard();
    expect(rows).toHaveLength(2);
    expect(rows![0].memberCount).toBe(0);
    expect(rows![0].name).toBe('Alpha');
  });
});
