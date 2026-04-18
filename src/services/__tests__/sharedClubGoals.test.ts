/**
 * Shared-club-goals client surface tests.
 *
 * Cloud Function behaviour (atomic completion, per-member reward fan-out) is
 * exercised in the functions/ deploy smoke; these tests lock down the client
 * wrapper contract: when Firebase is not configured the three firestoreService
 * helpers short-circuit to safe sentinels so the UI degrades cleanly.
 */

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: false,
  default: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
  onSnapshot: jest.fn(() => () => {}),
  increment: jest.fn((n: number) => n),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
  runTransaction: jest.fn(),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/app', () => ({}), { virtual: true });

import { firestoreService } from '../firestore';
import { getRemoteBoolean, getRemoteNumber } from '../remoteConfig';
import type { AnalyticsEventName } from '../analytics';

describe('shared club goals — client surface', () => {
  describe('firestoreService helpers short-circuit when disabled', () => {
    it('getSharedClubGoals returns [] when firebase is not configured', async () => {
      const goals = await firestoreService.getSharedClubGoals('club_1');
      expect(goals).toEqual([]);
    });

    it('getPendingSharedGoalRewards returns [] when firebase is not configured', async () => {
      const rewards = await firestoreService.getPendingSharedGoalRewards('uid_1');
      expect(rewards).toEqual([]);
    });

    it('markSharedGoalRewardClaimed returns false when firebase is not configured', async () => {
      const ok = await firestoreService.markSharedGoalRewardClaimed('uid_1', 'r_1');
      expect(ok).toBe(false);
    });

    it('markSharedGoalRewardClaimed guards against empty ids', async () => {
      expect(await firestoreService.markSharedGoalRewardClaimed('', 'r_1')).toBe(false);
      expect(await firestoreService.markSharedGoalRewardClaimed('uid_1', '')).toBe(false);
    });

    it('getSharedClubGoals guards against missing clubId', async () => {
      const goals = await firestoreService.getSharedClubGoals('');
      expect(goals).toEqual([]);
    });

    it('getPendingSharedGoalRewards guards against missing userId', async () => {
      const rewards = await firestoreService.getPendingSharedGoalRewards('');
      expect(rewards).toEqual([]);
    });
  });

  describe('Remote Config defaults', () => {
    it('ships sharedClubGoalsEnabled=true out of the box', () => {
      expect(getRemoteBoolean('sharedClubGoalsEnabled')).toBe(true);
    });

    it('ships sharedGoalsPerWeek=1 (2 personal + 1 shared)', () => {
      expect(getRemoteNumber('sharedGoalsPerWeek')).toBe(1);
    });
  });

  describe('analytics event names', () => {
    it('permits the three shared-goal lifecycle events', () => {
      const ev1: AnalyticsEventName = 'shared_goal_progress';
      const ev2: AnalyticsEventName = 'shared_goal_completed';
      const ev3: AnalyticsEventName = 'shared_goal_reward_claimed';
      expect([ev1, ev2, ev3]).toHaveLength(3);
    });
  });
});
