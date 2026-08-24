/**
 * createSocialMethods — friend-challenge send path.
 *
 * Friend challenges have no receive side: nothing reads
 * `users/{uid}/challenges` and no surface renders
 * `friendChallenges.received`. Two things must hold until a reader ships —
 * an undeliverable challenge is not persisted into the player blob (which
 * rides along in every debounced save and cloud sync), and the backlog that
 * already accumulated gets pruned instead of growing by one per tap forever.
 */

const mockBooleans = new Map<string, boolean>();

jest.mock('../../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean => mockBooleans.get(key) ?? false,
}));

jest.mock('../../data/cosmetics', () => ({
  getTitleLabel: () => 'Player',
}));

import { createSocialMethods, PlayerSocialData } from '../PlayerSocialContext';
import { FriendChallenge } from '../../types';

const boardConfig = {
  rows: 5,
  cols: 5,
  wordCount: 4,
  minWordLength: 3,
  maxWordLength: 6,
  difficulty: 'easy' as const,
};

function challengeAt(id: string, expiresAtMs: number): FriendChallenge {
  return {
    id,
    challengerId: 'me',
    challengerName: 'Player',
    challengerScore: 100,
    challengerStars: 3,
    challengerTime: 60,
    level: 1,
    seed: 1,
    mode: 'classic',
    boardConfig,
    createdAt: new Date(expiresAtMs - 7 * 86_400_000).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    status: 'pending',
  };
}

function harness(sent: FriendChallenge[] = []) {
  let state: PlayerSocialData = {
    friendChallenges: { sent, received: [] },
    clubId: null,
    friendIds: [],
    hintGiftsSentToday: 0,
    lastGiftDate: '',
    tileGiftsSentToday: 0,
    equippedTitle: '',
  };
  const methods = createSocialMethods<PlayerSocialData>(
    (updater) => {
      state = updater(state);
    },
    null,
    () => state,
  );
  return { methods, get: () => state };
}

const puzzleData = {
  score: 500,
  stars: 3,
  time: 42,
  level: 12,
  seed: 987,
  mode: 'classic' as const,
  boardConfig,
};

beforeEach(() => {
  mockBooleans.clear();
});

describe('sendChallenge', () => {
  it('does not persist a challenge while delivery is disabled', () => {
    const { methods, get } = harness();
    const challenge = methods.sendChallenge('friend_1', puzzleData);
    // Still returned for the local "challenge code" display...
    expect(challenge.level).toBe(12);
    // ...but nothing undeliverable is banked into the persisted blob.
    expect(get().friendChallenges.sent).toHaveLength(0);
  });

  it('prunes expired challenges out of old saves even when disabled', () => {
    const expired = challengeAt('old_1', Date.now() - 1000);
    const live = challengeAt('live_1', Date.now() + 86_400_000);
    const { methods, get } = harness([expired, live]);
    methods.sendChallenge('friend_1', puzzleData);
    expect(get().friendChallenges.sent.map((c) => c.id)).toEqual(['live_1']);
  });

  it('persists a bounded list once delivery is enabled', () => {
    mockBooleans.set('friendChallengesEnabled', true);
    const backlog = Array.from({ length: 40 }, (_, i) =>
      challengeAt(`old_${i}`, Date.now() + 86_400_000),
    );
    const { methods, get } = harness(backlog);
    methods.sendChallenge('friend_1', puzzleData);
    const sent = get().friendChallenges.sent;
    expect(sent.length).toBeLessThanOrEqual(20);
    // The newest entry is the one just sent.
    expect(sent[sent.length - 1].level).toBe(12);
  });
});
