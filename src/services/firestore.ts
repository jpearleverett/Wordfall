/**
 * Firestore Social Layer Service
 *
 * Provides leaderboards, friend system, gifting, and club foundations.
 * All operations gracefully degrade when Firebase is not configured —
 * the app works fully offline with local data and upgrades to real
 * social features when Firebase env vars are set.
 *
 * ─── Recommended Firestore Security Rules ───────────────────────────────────
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *
 *     // Users: owner can write, anyone authenticated can read (for leaderboards/friends)
 *     match /users/{userId} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth != null && request.auth.uid == userId;
 *     }
 *
 *     // Daily scores: owner can write own entry, anyone can read
 *     match /dailyScores/{docId} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
 *       allow update: if request.auth != null && resource.data.userId == request.auth.uid;
 *     }
 *
 *     // Weekly scores: same pattern
 *     match /weeklyScores/{docId} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
 *       allow update: if request.auth != null && resource.data.userId == request.auth.uid;
 *     }
 *
 *     // Friendships: participants can read/write
 *     match /friendships/{friendshipId} {
 *       allow read: if request.auth != null && request.auth.uid in resource.data.users;
 *       allow create: if request.auth != null && request.auth.uid in request.resource.data.users;
 *       allow update: if request.auth != null && request.auth.uid in resource.data.users;
 *       allow delete: if request.auth != null && request.auth.uid in resource.data.users;
 *     }
 *
 *     // Gifts: sender can create, recipient can read/update (claim)
 *     match /gifts/{giftId} {
 *       allow create: if request.auth != null && request.resource.data.fromUserId == request.auth.uid;
 *       allow read: if request.auth != null &&
 *         (resource.data.toUserId == request.auth.uid || resource.data.fromUserId == request.auth.uid);
 *       allow update: if request.auth != null && resource.data.toUserId == request.auth.uid;
 *     }
 *
 *     // Clubs: members can read, owner/elders can write
 *     match /clubs/{clubId} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth != null;
 *       allow update: if request.auth != null && request.auth.uid in resource.data.memberIds;
 *       match /messages/{messageId} {
 *         allow read: if request.auth != null;
 *         allow create: if request.auth != null;
 *       }
 *     }
 *   }
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ─── Required Firestore Composite Indexes ───────────────────────────────────
 *
 * Collection: dailyScores  — Fields: date ASC, score DESC
 * Collection: weeklyScores — Fields: weekId ASC, score DESC
 * Collection: friendships  — Fields: users (array-contains), status ASC
 * Collection: gifts        — Fields: toUserId ASC, claimed ASC
 *
 * These indexes will be auto-suggested by Firestore on first query if missing.
 * You can also create them in the Firebase Console or via firebase.json.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, isFirebaseConfigured } from '../config/firebase';
import { logger } from '../utils/logger';
import { crashReporter } from './crashReporting';
import { withRetry } from './retry';
import {
  submitValidatedScore as submitValidatedScoreCallable,
  leaderboardValidationEnabled,
} from './leaderboardSubmit';

/**
 * Log a Firestore mutation failure to both the local logger (dev visibility)
 * and Sentry (prod diagnosability). Tag with {collection, op}.
 */
function logFirestoreError(op: string, collectionName: string, e: unknown): void {
  logger.warn(`[Firestore] ${op} failed:`, e);
  crashReporter.captureException(
    e instanceof Error ? e : new Error(String(e)),
    { tags: { service: 'firestore', op, collection: collectionName } },
  );
}
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  documentId,
} from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}_W${String(weekNumber).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirestoreUserProfile {
  displayName: string;
  level: number;
  puzzlesSolved: number;
  totalScore: number;
  currentStreak: number;
  equippedFrame: string;
  equippedTitle: string;
  friendCode: string;
  lastActive: any; // Firestore Timestamp
}

export interface FirestoreLeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  stars?: number;
  level?: number;
  date?: string;
  weekId?: string;
  timestamp?: any;
}

export interface FirestoreFriendship {
  id: string;
  users: [string, string];
  status: 'pending' | 'accepted';
  requestedBy: string;
  createdAt: any;
}

export interface FirestoreGift {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  type: 'hint' | 'tile' | 'life';
  amount: number;
  claimed: boolean;
  createdAt: any;
  expiresAt: any;
}

export interface ClubMessage {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
  type: 'text';
}

// ─── Service ──────────────────────────────────────────────────────────────────

class FirestoreService {
  private get enabled(): boolean {
    return isFirebaseConfigured;
  }

  // ── Player Profile ────────────────────────────────────────────────────────

  /**
   * Upsync player profile data to users/{userId} for leaderboards and friend display.
   */
  async syncPlayerProfile(
    userId: string,
    data: {
      displayName: string;
      level: number;
      puzzlesSolved: number;
      totalScore: number;
      currentStreak: number;
      equippedFrame: string;
      equippedTitle: string;
    }
  ): Promise<void> {
    if (!this.enabled || !userId) return;
    try {
      const userRef = doc(db, 'users', userId);
      // tzOffsetMinutes is positive east of UTC (inverted from Date#getTimezoneOffset)
      // so the Cloud-Function local-hour math in functions/src/social.ts matches
      // `new Date(utcMs + tzOffsetMinutes * 60_000).getUTCHours()`.
      const tzOffsetMinutes = -new Date().getTimezoneOffset();
      const lastActiveDate = new Date().toISOString().slice(0, 10);
      await setDoc(
        userRef,
        {
          ...data,
          lastActive: serverTimestamp(),
          tzOffsetMinutes,
          lastActiveDate,
        },
        { merge: true }
      );
    } catch (e) {
      logFirestoreError('syncPlayerProfile', 'users', e);
    }
  }

  /**
   * Generate or retrieve a short friend code for the user.
   * Stored in the user's profile document.
   */
  async generateFriendCode(userId: string): Promise<string> {
    if (!this.enabled || !userId) return userId.slice(0, 8).toUpperCase();
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().friendCode) {
        return snap.data().friendCode;
      }
      // Generate a code from the userId — deterministic but short
      const code = userId.slice(0, 8).toUpperCase();
      await setDoc(userRef, { friendCode: code }, { merge: true });
      return code;
    } catch (e) {
      logger.warn('[Firestore] generateFriendCode failed:', e);
      return userId.slice(0, 8).toUpperCase();
    }
  }

  /**
   * Look up a user by friend code. Returns userId + displayName or null.
   */
  async findUserByFriendCode(
    friendCode: string
  ): Promise<{ userId: string; displayName: string } | null> {
    if (!this.enabled) return null;
    try {
      const q = query(
        collection(db, 'users'),
        where('friendCode', '==', friendCode.toUpperCase()),
        firestoreLimit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { userId: d.id, displayName: d.data().displayName || 'Player' };
    } catch (e) {
      logger.warn('[Firestore] findUserByFriendCode failed:', e);
      return null;
    }
  }

  // ── Leaderboards ──────────────────────────────────────────────────────────

  /**
   * Get today's daily challenge leaderboard.
   */
  async getDailyLeaderboard(
    limitCount: number = 50
  ): Promise<FirestoreLeaderboardEntry[]> {
    if (!this.enabled) return [];
    try {
      const today = getTodayDateString();
      const q = query(
        collection(db, 'dailyScores'),
        where('date', '==', today),
        orderBy('score', 'desc'),
        firestoreLimit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        userId: d.data().userId,
        displayName: d.data().displayName || 'Player',
        score: d.data().score || 0,
        stars: d.data().stars,
        level: d.data().level,
        date: d.data().date,
      }));
    } catch (e) {
      logger.warn('[Firestore] getDailyLeaderboard failed:', e);
      return [];
    }
  }

  /**
   * Get current week's leaderboard.
   */
  async getWeeklyLeaderboard(
    limitCount: number = 50
  ): Promise<FirestoreLeaderboardEntry[]> {
    if (!this.enabled) return [];
    try {
      const weekId = getCurrentWeekId();
      const q = query(
        collection(db, 'weeklyScores'),
        where('weekId', '==', weekId),
        orderBy('score', 'desc'),
        firestoreLimit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        userId: d.data().userId,
        displayName: d.data().displayName || 'Player',
        score: d.data().score || 0,
        weekId: d.data().weekId,
      }));
    } catch (e) {
      logger.warn('[Firestore] getWeeklyLeaderboard failed:', e);
      return [];
    }
  }

  /**
   * Get all-time leaderboard from user profiles.
   */
  async getAllTimeLeaderboard(
    limitCount: number = 50
  ): Promise<FirestoreLeaderboardEntry[]> {
    if (!this.enabled) return [];
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('totalScore', 'desc'),
        firestoreLimit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        userId: d.id,
        displayName: d.data().displayName || 'Player',
        score: d.data().totalScore || 0,
        level: d.data().level,
      }));
    } catch (e) {
      logger.warn('[Firestore] getAllTimeLeaderboard failed:', e);
      return [];
    }
  }

  /**
   * Submit a daily challenge score.
   * Uses a composite doc ID so each user gets one entry per day.
   */
  async submitDailyScore(
    userId: string,
    score: number,
    stars: number,
    level: number,
    displayName: string
  ): Promise<void> {
    if (!this.enabled || !userId) return;
    // Tier 6 B4 — route through the validated-score Cloud Function when the
    // RC flag is on. Keeps the direct-write fallback for the kill-switch
    // case, so flipping the flag off doesn't break leaderboards.
    if (leaderboardValidationEnabled()) {
      try {
        await submitValidatedScoreCallable({
          scope: 'daily',
          score,
          stars,
          level,
          displayName,
        });
        return;
      } catch (e) {
        logFirestoreError('submitDailyScore(callable)', 'dailyScores', e);
        return;
      }
    }
    try {
      const today = getTodayDateString();
      const docId = `${userId}_${today}`;
      const docRef = doc(db, 'dailyScores', docId);
      // Only overwrite if the new score is higher
      const existing = await getDoc(docRef);
      if (existing.exists() && existing.data().score >= score) return;
      await withRetry(
        () =>
          setDoc(docRef, {
            userId,
            displayName,
            score,
            stars,
            level,
            date: today,
            timestamp: serverTimestamp(),
          }),
        { label: 'submitDailyScore' },
      );
    } catch (e) {
      logFirestoreError('submitDailyScore', 'dailyScores', e);
    }
  }

  /**
   * Submit or update weekly score (cumulative for the week).
   */
  async submitWeeklyScore(
    userId: string,
    score: number,
    displayName: string
  ): Promise<void> {
    if (!this.enabled || !userId) return;
    if (leaderboardValidationEnabled()) {
      try {
        await submitValidatedScoreCallable({
          scope: 'weekly',
          score,
          displayName,
        });
        return;
      } catch (e) {
        logFirestoreError('submitWeeklyScore(callable)', 'weeklyScores', e);
        return;
      }
    }
    try {
      const weekId = getCurrentWeekId();
      const docId = `${userId}_${weekId}`;
      const docRef = doc(db, 'weeklyScores', docId);
      const existing = await getDoc(docRef);
      const prevScore = existing.exists() ? existing.data().score || 0 : 0;
      await withRetry(
        () =>
          setDoc(docRef, {
            userId,
            displayName,
            score: prevScore + score,
            weekId,
            timestamp: serverTimestamp(),
          }),
        { label: 'submitWeeklyScore' },
      );
    } catch (e) {
      logFirestoreError('submitWeeklyScore', 'weeklyScores', e);
    }
  }

  /**
   * MG2 in launch_blockers.md: per-event cumulative leaderboard.
   * Mirrors `submitWeeklyScore` but scopes to `events/{eventId}/scores/{uid}`
   * so each event has its own ranking independent of weekly/daily scores.
   */
  async submitEventScore(
    eventId: string,
    userId: string,
    score: number,
    displayName: string,
  ): Promise<void> {
    if (!this.enabled || !userId || !eventId) return;
    if (leaderboardValidationEnabled()) {
      try {
        await submitValidatedScoreCallable({
          scope: 'event',
          score,
          eventId,
          displayName,
        });
        return;
      } catch (e) {
        logFirestoreError('submitEventScore(callable)', 'events.scores', e);
        return;
      }
    }
    try {
      const docRef = doc(db, 'events', eventId, 'scores', userId);
      const existing = await getDoc(docRef);
      const prevScore = existing.exists() ? existing.data().score || 0 : 0;
      await withRetry(
        () =>
          setDoc(docRef, {
            userId,
            displayName,
            score: prevScore + score,
            eventId,
            timestamp: serverTimestamp(),
          }),
        { label: 'submitEventScore' },
      );
    } catch (e) {
      logFirestoreError('submitEventScore', 'events.scores', e);
    }
  }

  /**
   * Read the top-N scores for a given event, ordered by score desc.
   * Returns an empty array when Firestore is unavailable so the UI
   * can degrade gracefully (same pattern as daily/weekly leaderboards).
   */
  async getEventLeaderboard(
    eventId: string,
    limitCount: number = 50,
  ): Promise<Array<{
    userId: string;
    displayName: string;
    score: number;
  }>> {
    if (!this.enabled || !eventId) return [];
    try {
      const q = query(
        collection(db, 'events', eventId, 'scores'),
        orderBy('score', 'desc'),
        firestoreLimit(Math.max(1, Math.min(100, limitCount))),
      );
      const snap = await getDocs(q);
      const out: Array<{ userId: string; displayName: string; score: number }> = [];
      snap.forEach((s) => {
        const d = s.data();
        out.push({
          userId: String(d.userId ?? ''),
          displayName: String(d.displayName ?? 'Player'),
          score: Number(d.score ?? 0),
        });
      });
      return out;
    } catch (e) {
      logFirestoreError('getEventLeaderboard', 'events.scores', e);
      return [];
    }
  }

  // ── Friend System ─────────────────────────────────────────────────────────

  /**
   * Get all accepted friendships for a user.
   */
  async getFriends(userId: string): Promise<FirestoreFriendship[]> {
    if (!this.enabled || !userId) return [];
    try {
      // Firestore array-contains only checks one field, so we query by the users array
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', userId),
        where('status', '==', 'accepted')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        users: d.data().users,
        status: d.data().status,
        requestedBy: d.data().requestedBy,
        createdAt: d.data().createdAt,
      }));
    } catch (e) {
      logger.warn('[Firestore] getFriends failed:', e);
      return [];
    }
  }

  /**
   * Get pending friend requests (incoming).
   */
  async getPendingFriendRequests(userId: string): Promise<FirestoreFriendship[]> {
    if (!this.enabled || !userId) return [];
    try {
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', userId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      // Only return requests where the current user did NOT initiate
      return snap.docs
        .map((d) => ({
          id: d.id,
          users: d.data().users,
          status: d.data().status as 'pending',
          requestedBy: d.data().requestedBy,
          createdAt: d.data().createdAt,
        }))
        .filter((f) => f.requestedBy !== userId);
    } catch (e) {
      logger.warn('[Firestore] getPendingFriendRequests failed:', e);
      return [];
    }
  }

  /**
   * Send a friend request by friend code.
   * Returns the friend's userId on success, null on failure.
   */
  async addFriend(
    userId: string,
    friendCode: string
  ): Promise<{ friendUserId: string; friendName: string } | null> {
    if (!this.enabled || !userId) return null;
    try {
      const found = await this.findUserByFriendCode(friendCode);
      if (!found) return null;
      if (found.userId === userId) return null; // Can't friend yourself

      const friendshipId = [userId, found.userId].sort().join('_');
      const friendshipRef = doc(db, 'friendships', friendshipId);

      // Check if friendship already exists
      const existing = await getDoc(friendshipRef);
      if (existing.exists()) {
        const data = existing.data();
        if (data.status === 'pending' && data.requestedBy !== userId) {
          // Accept the pending request from the other user
          await updateDoc(friendshipRef, { status: 'accepted' });
          return { friendUserId: found.userId, friendName: found.displayName };
        }
        // Already friends or already sent request
        return null;
      }

      await setDoc(friendshipRef, {
        users: [userId, found.userId].sort(),
        status: 'pending',
        requestedBy: userId,
        createdAt: serverTimestamp(),
      });
      return { friendUserId: found.userId, friendName: found.displayName };
    } catch (e) {
      logFirestoreError('addFriend', 'friendships', e);
      return null;
    }
  }

  /**
   * Accept a pending friend request.
   */
  async acceptFriendRequest(friendshipId: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const ref = doc(db, 'friendships', friendshipId);
      await updateDoc(ref, { status: 'accepted' });
      return true;
    } catch (e) {
      logFirestoreError('acceptFriendRequest', 'friendships', e);
      return false;
    }
  }

  /**
   * Get friend scores for a specific daily or level for comparison.
   * Returns an array of {userId, displayName, score}.
   */
  async getFriendScores(
    userId: string,
    friendIds: string[],
    date?: string
  ): Promise<{ beaten: number; total: number }> {
    if (!this.enabled || friendIds.length === 0) {
      return { beaten: 0, total: 0 };
    }
    try {
      const targetDate = date || getTodayDateString();
      // Firestore 'in' query limited to 30 values
      const batchIds = friendIds.slice(0, 30).map(
        (fid) => `${fid}_${targetDate}`
      );

      // We need to fetch in batches of 10 (Firestore 'in' limit)
      let allScores: number[] = [];
      for (let i = 0; i < batchIds.length; i += 10) {
        const batch = batchIds.slice(i, i + 10);
        const q = query(
          collection(db, 'dailyScores'),
          where(documentId(), 'in', batch)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          allScores.push(d.data().score || 0);
        }
      }

      // Get the current user's score for comparison
      const myDocId = `${userId}_${targetDate}`;
      const mySnap = await getDoc(doc(db, 'dailyScores', myDocId));
      const myScore = mySnap.exists() ? mySnap.data().score || 0 : 0;

      const beaten = allScores.filter((s) => myScore > s).length;
      return { beaten, total: allScores.length };
    } catch (e) {
      logger.warn('[Firestore] getFriendScores failed:', e);
      return { beaten: 0, total: 0 };
    }
  }

  /**
   * Fetch today's daily-score entries for a set of friend UIDs plus the
   * current user. Returns `{ userId, displayName, score }` rows sorted by
   * score desc for the home friend-leaderboard card. Resolves to [] when
   * Firestore is not configured or the id set is empty.
   */
  async getFriendDailyScores(
    userId: string,
    friendIds: string[],
    date?: string,
  ): Promise<Array<{ userId: string; displayName: string; score: number }>> {
    if (!this.enabled || !userId) return [];
    try {
      const targetDate = date || getTodayDateString();
      const ids = Array.from(new Set([userId, ...friendIds])).slice(0, 30);
      if (ids.length === 0) return [];
      const docIds = ids.map((uid) => `${uid}_${targetDate}`);

      const results: Array<{ userId: string; displayName: string; score: number }> = [];
      for (let i = 0; i < docIds.length; i += 10) {
        const batch = docIds.slice(i, i + 10);
        const q = query(
          collection(db, 'dailyScores'),
          where(documentId(), 'in', batch),
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const data = d.data();
          if (typeof data.userId !== 'string') continue;
          results.push({
            userId: data.userId,
            displayName: data.displayName || 'Player',
            score: typeof data.score === 'number' ? data.score : 0,
          });
        }
      }
      return results.sort((a, b) => b.score - a.score);
    } catch (e) {
      logger.warn('[Firestore] getFriendDailyScores failed:', e);
      return [];
    }
  }

  /**
   * Prefix-search the users collection by displayName. Returns up to
   * `maxResults` matches (case-sensitive against the stored displayName;
   * users enter their own capitalization). Excludes self.
   */
  async searchUsersByDisplayName(
    query_: string,
    selfUserId: string,
    maxResults = 10,
  ): Promise<Array<{ userId: string; displayName: string }>> {
    if (!this.enabled) return [];
    const trimmed = query_.trim();
    if (trimmed.length < 2) return [];
    try {
      // Firestore range query for prefix: >= prefix, < prefix + \uf8ff
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', trimmed),
        where('displayName', '<', trimmed + '\uf8ff'),
        firestoreLimit(maxResults),
      );
      const snap = await getDocs(q);
      return snap.docs
        .filter((d) => d.id !== selfUserId)
        .map((d) => ({
          userId: d.id,
          displayName: d.data().displayName || 'Player',
        }));
    } catch (e) {
      logger.warn('[Firestore] searchUsersByDisplayName failed:', e);
      return [];
    }
  }

  /**
   * Create a pending friendship. Returns the friendship doc id on success,
   * `null` if already-friends or already-pending, or `'self'` if the user
   * tries to friend themselves. Mirror of `addFriend` but takes a direct
   * UID instead of a friend code.
   */
  async createFriendRequest(
    fromUserId: string,
    toUserId: string,
  ): Promise<'self' | 'exists' | { friendshipId: string } | null> {
    if (!this.enabled || !fromUserId || !toUserId) return null;
    if (fromUserId === toUserId) return 'self';
    try {
      const friendshipId = [fromUserId, toUserId].sort().join('_');
      const ref = doc(db, 'friendships', friendshipId);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const data = existing.data();
        if (data.status === 'pending' && data.requestedBy !== fromUserId) {
          await updateDoc(ref, { status: 'accepted' });
          return { friendshipId };
        }
        return 'exists';
      }
      await setDoc(ref, {
        users: [fromUserId, toUserId].sort(),
        status: 'pending',
        requestedBy: fromUserId,
        createdAt: serverTimestamp(),
      });
      return { friendshipId };
    } catch (e) {
      logFirestoreError('createFriendRequest', 'friendships', e);
      return null;
    }
  }

  /**
   * Accept or decline a pending friend request. Declining removes the doc
   * so the sender can retry later; accepting flips `status` to 'accepted'.
   */
  async respondToFriendRequest(
    friendshipId: string,
    accept: boolean,
  ): Promise<boolean> {
    if (!this.enabled || !friendshipId) return false;
    try {
      const ref = doc(db, 'friendships', friendshipId);
      if (accept) {
        await updateDoc(ref, { status: 'accepted' });
      } else {
        await deleteDoc(ref);
      }
      return true;
    } catch (e) {
      logFirestoreError('respondToFriendRequest', 'friendships', e);
      return false;
    }
  }

  // ── Gifting ───────────────────────────────────────────────────────────────

  /**
   * Send a gift to another user via Firestore.
   */
  async sendGift(
    fromUserId: string,
    fromDisplayName: string,
    toUserId: string,
    giftType: 'hint' | 'tile',
    amount: number = 1
  ): Promise<boolean> {
    if (!this.enabled || !fromUserId || !toUserId) return false;
    try {
      await addDoc(collection(db, 'gifts'), {
        fromUserId,
        fromDisplayName,
        toUserId,
        type: giftType,
        amount,
        claimed: false,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
      });
      return true;
    } catch (e) {
      logFirestoreError('sendGift', 'gifts', e);
      return false;
    }
  }

  /**
   * Get all unclaimed gifts for a user.
   */
  async getPendingGifts(userId: string): Promise<FirestoreGift[]> {
    if (!this.enabled || !userId) return [];
    try {
      const q = query(
        collection(db, 'gifts'),
        where('toUserId', '==', userId),
        where('claimed', '==', false)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        fromUserId: d.data().fromUserId,
        fromDisplayName: d.data().fromDisplayName || 'A friend',
        toUserId: d.data().toUserId,
        type: d.data().type,
        amount: d.data().amount || 1,
        claimed: d.data().claimed,
        createdAt: d.data().createdAt,
        expiresAt: d.data().expiresAt,
      }));
    } catch (e) {
      logger.warn('[Firestore] getPendingGifts failed:', e);
      return [];
    }
  }

  /**
   * Claim a gift — marks it as claimed in Firestore.
   */
  async claimGift(giftId: string): Promise<boolean> {
    if (!this.enabled || !giftId) return false;
    try {
      const giftRef = doc(db, 'gifts', giftId);
      await updateDoc(giftRef, { claimed: true });
      return true;
    } catch (e) {
      logFirestoreError('claimGift', 'gifts', e);
      return false;
    }
  }

  // ── Club Foundations ───────────────────────────────────────────────────────

  /**
   * Create a new club. Returns the club ID.
   */
  async createClub(
    ownerId: string,
    name: string,
    description: string
  ): Promise<string | null> {
    if (!this.enabled || !ownerId) return null;
    try {
      const clubRef = await addDoc(collection(db, 'clubs'), {
        name,
        description,
        ownerId,
        memberIds: [ownerId],
        memberCount: 1,
        maxMembers: 30,
        autoKickDays: 14,
        weeklyScore: 0,
        totalScore: 0,
        createdAt: serverTimestamp(),
      });
      return clubRef.id;
    } catch (e) {
      logFirestoreError('createClub', 'clubs', e);
      return null;
    }
  }

  /**
   * Get club data by ID.
   */
  async getClub(clubId: string): Promise<any | null> {
    if (!this.enabled || !clubId) return null;
    try {
      const snap = await getDoc(doc(db, 'clubs', clubId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (e) {
      logger.warn('[Firestore] getClub failed:', e);
      return null;
    }
  }

  /**
   * List public clubs that the player can browse + join (S1 in
   * launch_blockers.md). Sorted by weeklyScore descending so active
   * clubs appear first. Empty filter arguments match all clubs.
   *
   * @param opts.maxMembers     Cap on member count (excludes full clubs).
   * @param opts.minWeeklyScore Minimum weekly score threshold.
   * @param opts.limit          Max results to return (default 20).
   * @returns Array of { id, name, description, memberCount, maxMembers,
   *                    weeklyScore, ownerId } — safe subset for browsing.
   */
  async listPublicClubs(opts?: {
    maxMembers?: number;
    minWeeklyScore?: number;
    limit?: number;
  }): Promise<Array<{
    id: string;
    name: string;
    description: string;
    memberCount: number;
    maxMembers: number;
    weeklyScore: number;
    ownerId: string;
  }>> {
    if (!this.enabled) return [];
    try {
      const pageSize = Math.max(1, Math.min(50, opts?.limit ?? 20));
      // Order by weeklyScore descending — active clubs first. Firestore
      // can only apply one inequality per query, so membership-cap
      // filtering happens client-side after the read.
      const clubsQuery = query(
        collection(db, 'clubs'),
        orderBy('weeklyScore', 'desc'),
        firestoreLimit(pageSize * 2),
      );
      const snap = await getDocs(clubsQuery);
      const out: Array<{
        id: string;
        name: string;
        description: string;
        memberCount: number;
        maxMembers: number;
        weeklyScore: number;
        ownerId: string;
      }> = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const memberCount = Number(data.memberCount ?? 0);
        const maxMembers = Number(data.maxMembers ?? 30);
        const weeklyScore = Number(data.weeklyScore ?? 0);
        if (opts?.maxMembers && memberCount >= opts.maxMembers) continue;
        if (memberCount >= maxMembers) continue; // full
        if (opts?.minWeeklyScore !== undefined && weeklyScore < opts.minWeeklyScore) continue;
        out.push({
          id: docSnap.id,
          name: String(data.name ?? 'Club'),
          description: String(data.description ?? ''),
          memberCount,
          maxMembers,
          weeklyScore,
          ownerId: String(data.ownerId ?? ''),
        });
        if (out.length >= pageSize) break;
      }
      return out;
    } catch (e) {
      logFirestoreError('listPublicClubs', 'clubs', e);
      return [];
    }
  }

  // ── Club Chat ──────────────────────────────────────────────────────────────

  /**
   * Send a text message to a club's chat.
   * Message length is capped at 200 characters.
   */
  async sendClubMessage(
    clubId: string,
    userId: string,
    displayName: string,
    message: string
  ): Promise<void> {
    if (!this.enabled || !clubId || !userId) return;
    try {
      const trimmedMessage = message.slice(0, 200);
      if (!trimmedMessage.trim()) return;
      await addDoc(collection(db, 'clubs', clubId, 'messages'), {
        userId,
        displayName,
        message: trimmedMessage,
        timestamp: serverTimestamp(),
        type: 'text',
      });
    } catch (e) {
      logFirestoreError('sendClubMessage', 'clubs/messages', e);
    }
  }

  /**
   * Report a message for moderation review.
   * Writes into the admin-only `reports/` collection (clients cannot read).
   */
  async reportMessage(
    reporterId: string,
    clubId: string,
    messageId: string,
    messageUserId: string,
    reason: string,
    messageText?: string,
  ): Promise<boolean> {
    if (!this.enabled || !reporterId) return false;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId,
        targetType: 'message',
        clubId,
        messageId,
        messageUserId,
        reason: reason.slice(0, 500),
        messageText: messageText ? messageText.slice(0, 500) : null,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      logger.warn('[Firestore] reportMessage failed:', e);
      return false;
    }
  }

  /**
   * Report a user for moderation review.
   */
  async reportUser(
    reporterId: string,
    targetUserId: string,
    reason: string,
  ): Promise<boolean> {
    if (!this.enabled || !reporterId) return false;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId,
        targetType: 'user',
        targetUserId,
        reason: reason.slice(0, 500),
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      logger.warn('[Firestore] reportUser failed:', e);
      return false;
    }
  }

  /**
   * Block another user. Subsequent messages from them are filtered client-side.
   */
  async blockUser(currentUserId: string, blockedUserId: string): Promise<boolean> {
    if (!this.enabled || !currentUserId || !blockedUserId) return false;
    if (currentUserId === blockedUserId) return false;
    try {
      await setDoc(doc(db, `users/${currentUserId}/blockedUsers/${blockedUserId}`), {
        blockedAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      logger.warn('[Firestore] blockUser failed:', e);
      return false;
    }
  }

  async unblockUser(currentUserId: string, blockedUserId: string): Promise<boolean> {
    if (!this.enabled || !currentUserId || !blockedUserId) return false;
    try {
      await deleteDoc(doc(db, `users/${currentUserId}/blockedUsers/${blockedUserId}`));
      return true;
    } catch (e) {
      logger.warn('[Firestore] unblockUser failed:', e);
      return false;
    }
  }

  /**
   * Fetch the set of userIds this user has blocked.
   */
  async getBlockedUserIds(currentUserId: string): Promise<Set<string>> {
    if (!this.enabled || !currentUserId) return new Set();
    try {
      const snap = await getDocs(collection(db, `users/${currentUserId}/blockedUsers`));
      return new Set(snap.docs.map((d) => d.id));
    } catch (e) {
      logger.warn('[Firestore] getBlockedUserIds failed:', e);
      return new Set();
    }
  }

  /**
   * Get recent messages from a club's chat.
   * Returns messages ordered by most recent first, limited to `limitCount` (default 50).
   */
  async getClubMessages(
    clubId: string,
    limitCount: number = 50
  ): Promise<ClubMessage[]> {
    if (!this.enabled || !clubId) return [];
    try {
      const q = query(
        collection(db, 'clubs', clubId, 'messages'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        userId: d.data().userId || '',
        displayName: d.data().displayName || 'Player',
        message: d.data().message || '',
        timestamp: d.data().timestamp?.toMillis?.() ?? d.data().timestamp ?? Date.now(),
        type: 'text' as const,
      }));
    } catch (e) {
      logger.warn('[Firestore] getClubMessages failed:', e);
      return [];
    }
  }

  // ── Shared club goals ──────────────────────────────────────────────────────

  /**
   * List active shared goals for a club. Returns progress, target, and
   * per-member contributions (for the breakdown UI). Shared goals live at
   * clubs/{clubId}/sharedGoals; the onPuzzleComplete Cloud Function writes
   * them, and the weekly rotateClubGoals job archives + refreshes them.
   */
  async getSharedClubGoals(
    clubId: string,
  ): Promise<Array<{
    id: string;
    label: string;
    target: number;
    progress: number;
    trackingKey: string;
    duration: number;
    completed: boolean;
    memberContributions: Record<string, number>;
    rewardCoins: number;
    rewardGems: number;
  }>> {
    if (!this.enabled || !clubId) return [];
    try {
      const q = query(
        collection(db, 'clubs', clubId, 'sharedGoals'),
        where('active', '==', true),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          label: data.label ?? 'Shared Goal',
          target: data.target ?? 0,
          progress: data.progress ?? 0,
          trackingKey: data.trackingKey ?? '',
          duration: data.duration ?? 7,
          completed: data.completed === true,
          memberContributions: (data.memberContributions as Record<string, number>) ?? {},
          rewardCoins: data.rewardCoins ?? 800,
          rewardGems: data.rewardGems ?? 30,
        };
      });
    } catch (e) {
      logger.warn('[Firestore] getSharedClubGoals failed:', e);
      return [];
    }
  }

  /**
   * List unclaimed shared-goal reward inbox docs at users/{uid}/rewards
   * where type === 'shared_goal_complete' and claimed === false.
   */
  async getPendingSharedGoalRewards(
    userId: string,
  ): Promise<Array<{ id: string; goalLabel: string; coins: number; gems: number }>> {
    if (!this.enabled || !userId) return [];
    try {
      const q = query(
        collection(db, 'users', userId, 'rewards'),
        where('type', '==', 'shared_goal_complete'),
        where('claimed', '==', false),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          goalLabel: data.goalLabel ?? 'Club Goal',
          coins: data.coins ?? 0,
          gems: data.gems ?? 0,
        };
      });
    } catch (e) {
      logger.warn('[Firestore] getPendingSharedGoalRewards failed:', e);
      return [];
    }
  }

  /**
   * Flip a shared-goal reward to claimed. Local economy grant is applied by
   * the caller — same pattern as the referral inbox.
   */
  async markSharedGoalRewardClaimed(userId: string, rewardId: string): Promise<boolean> {
    if (!this.enabled || !userId || !rewardId) return false;
    try {
      const ref = doc(db, 'users', userId, 'rewards', rewardId);
      await updateDoc(ref, { claimed: true, claimedAt: serverTimestamp() });
      return true;
    } catch (e) {
      logFirestoreError('markSharedGoalRewardClaimed', 'rewards', e);
      return false;
    }
  }

  // ── Referral rewards ───────────────────────────────────────────────────────

  /**
   * Upsert the referralCodes/{code} → {uid} index doc. The onReferralSuccess
   * Cloud Function reads this collection to resolve a player-entered code back
   * to the referrer's UID. Safe to call repeatedly; writes are merged.
   */
  async upsertReferralCode(userId: string, referralCode: string): Promise<boolean> {
    if (!this.enabled || !userId || !referralCode) return false;
    try {
      const ref = doc(db, 'referralCodes', referralCode.toUpperCase());
      await setDoc(
        ref,
        {
          uid: userId,
          code: referralCode.toUpperCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    } catch (e) {
      logger.warn('[Firestore] upsertReferralCode failed:', e);
      return false;
    }
  }

  /**
   * List unclaimed referral reward inbox docs at users/{uid}/rewards
   * where type === 'referral' and claimed === false.
   */
  async getPendingReferralRewards(
    userId: string,
  ): Promise<Array<{
    id: string;
    gems: number;
    coins: number;
    hintTokens: number;
    lane: 'referrer' | 'referred';
    fromUserId: string | null;
    createdAt: number;
  }>> {
    if (!this.enabled || !userId) return [];
    try {
      const q = query(
        collection(db, 'users', userId, 'rewards'),
        where('type', '==', 'referral'),
        where('claimed', '==', false),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const created = data.createdAt;
        const createdAtMs =
          typeof created?.toMillis === 'function'
            ? created.toMillis()
            : typeof created === 'number'
              ? created
              : Date.now();
        return {
          id: d.id,
          gems: data.gems || 0,
          coins: data.coins || 0,
          hintTokens: data.hintTokens || 0,
          lane: (data.lane as 'referrer' | 'referred') || 'referrer',
          fromUserId: data.fromUserId || null,
          createdAt: createdAtMs,
        };
      });
    } catch (e) {
      logger.warn('[Firestore] getPendingReferralRewards failed:', e);
      return [];
    }
  }

  /**
   * Flip a referral reward to claimed. The local economy grant is applied by
   * the caller; this only touches the inbox doc.
   */
  async markReferralRewardClaimed(userId: string, rewardId: string): Promise<boolean> {
    if (!this.enabled || !userId || !rewardId) return false;
    try {
      const ref = doc(db, 'users', userId, 'rewards', rewardId);
      await updateDoc(ref, { claimed: true, claimedAt: serverTimestamp() });
      return true;
    } catch (e) {
      logFirestoreError('markReferralRewardClaimed', 'rewards', e);
      return false;
    }
  }

  /**
   * Check if Firebase is configured and available.
   */
  isAvailable(): boolean {
    return this.enabled;
  }
}

// Singleton export
export const firestoreService = new FirestoreService();
