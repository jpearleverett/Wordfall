/**
 * PlayerSocialContext — extracted from PlayerContext.
 *
 * Contains social-related logic: friend challenges, gifting (hint/tile gifts),
 * and Firestore social delivery.
 *
 * These functions are created here and imported back into PlayerContext
 * to keep the same external API surface (usePlayer() still returns everything).
 */
import { useCallback } from 'react';
import { useAuth } from './AuthContext';
import { FriendChallenge, GameMode, BoardConfig } from '../types';

const getToday = (): string => new Date().toISOString().split('T')[0];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlayerSocialData {
  friendChallenges: {
    sent: FriendChallenge[];
    received: FriendChallenge[];
  };
  clubId: string | null;
  friendIds: string[];
  hintGiftsSentToday: number;
  lastGiftDate: string;
  tileGiftsSentToday: number;
  equippedTitle: string;
}

export interface PlayerSocialMethods {
  sendHintGift: (friendId: string) => boolean;
  sendTileGift: (friendId: string, tileLetter: string) => boolean;
  sendChallenge: (friendId: string, puzzleData: {
    score: number;
    stars: number;
    time: number;
    level: number;
    seed: number;
    mode: GameMode;
    boardConfig: BoardConfig;
  }) => FriendChallenge;
  respondToChallenge: (challengeId: string, score: number, stars: number) => void;
  notifyFriendActivity: (friendName: string, event: string, detail: string) => void;
}

type SetDataFn<T> = (updater: (prev: T) => T) => void;

/**
 * Creates the social-related callbacks for PlayerContext.
 * Called inside PlayerProvider; receives `setData` and auth `user`.
 */
export function createSocialMethods<T extends PlayerSocialData>(
  setData: SetDataFn<T>,
  user: { uid: string } | null,
  getData: () => T,
): PlayerSocialMethods {

  const sendHintGift = (friendId: string): boolean => {
    const today = getToday();
    let success = false;
    setData((prev) => {
      const resetCount = prev.lastGiftDate !== today ? 0 : prev.hintGiftsSentToday;
      if (resetCount >= 1) return prev; // Max 1 hint gift per day per GDD
      success = true;
      return {
        ...prev,
        hintGiftsSentToday: resetCount + 1,
        lastGiftDate: today,
      };
    });
    // Deliver via Firestore if available
    if (success && user) {
      const data = getData();
      import('../services/firestore').then(({ firestoreService }) => {
        void firestoreService.sendGift(
          user.uid,
          data.equippedTitle || 'A friend',
          friendId,
          'hint',
          1
        );
      });
    }
    return success;
  };

  const sendTileGift = (friendId: string, tileLetter: string): boolean => {
    const today = getToday();
    let success = false;
    setData((prev) => {
      const resetCount = prev.lastGiftDate !== today ? 0 : prev.tileGiftsSentToday;
      if (resetCount >= 3) return prev; // Max 3 tile gifts per day per GDD
      success = true;
      return {
        ...prev,
        tileGiftsSentToday: resetCount + 1,
        lastGiftDate: today,
      };
    });
    // Deliver via Firestore if available
    if (success && user) {
      const data = getData();
      import('../services/firestore').then(({ firestoreService }) => {
        void firestoreService.sendGift(
          user.uid,
          data.equippedTitle || 'A friend',
          friendId,
          'tile',
          1
        );
      });
    }
    return success;
  };

  const sendChallenge = (friendId: string, puzzleData: {
    score: number;
    stars: number;
    time: number;
    level: number;
    seed: number;
    mode: GameMode;
    boardConfig: BoardConfig;
  }): FriendChallenge => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const data = getData();
    const challenge: FriendChallenge = {
      id: `challenge_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      challengerId: user?.uid ?? 'local_player',
      challengerName: data.equippedTitle || 'Player',
      challengerScore: puzzleData.score,
      challengerStars: puzzleData.stars,
      challengerTime: puzzleData.time,
      level: puzzleData.level,
      seed: puzzleData.seed,
      mode: puzzleData.mode,
      boardConfig: puzzleData.boardConfig,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    setData((prev) => ({
      ...prev,
      friendChallenges: {
        ...prev.friendChallenges,
        sent: [...prev.friendChallenges.sent, challenge],
      },
    }));

    // Persist challenge to Firestore for cross-device delivery
    if (user) {
      import('../services/firestore').then(async ({ firestoreService }) => {
        try {
          // Store under the recipient's challenges subcollection so they can receive it
          const { doc, setDoc, collection: firestoreCollection } = await import('firebase/firestore');
          const { db, isFirebaseConfigured } = await import('../config/firebase');
          if (!isFirebaseConfigured || !db) return;

          const challengeRef = doc(firestoreCollection(db, 'users', friendId, 'challenges'), challenge.id);
          await setDoc(challengeRef, {
            ...challenge,
            recipientId: friendId,
          });
        } catch (e) {
          // Gracefully fail — challenge is still saved locally
          if (__DEV__) console.warn('[PlayerSocial] Failed to persist challenge to Firestore:', e);
        }
      });
    }

    return challenge;
  };

  const respondToChallenge = (challengeId: string, score: number, stars: number): void => {
    setData((prev) => {
      const updatedReceived = prev.friendChallenges.received.map((c) => {
        if (c.id === challengeId) {
          return { ...c, status: 'completed' as const, respondentScore: score, respondentStars: stars };
        }
        return c;
      });
      return {
        ...prev,
        friendChallenges: {
          ...prev.friendChallenges,
          received: updatedReceived,
        },
      };
    });
  };

  const notifyFriendActivity = (friendName: string, event: string, detail: string): void => {
    import('../services/notificationTriggers').then(({ triggerSocialProofNotification }) => {
      void triggerSocialProofNotification(friendName, event, detail);
    });
  };

  return {
    sendHintGift,
    sendTileGift,
    sendChallenge,
    respondToChallenge,
    notifyFriendActivity,
  };
}
