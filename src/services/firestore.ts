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
 */

import { db, isFirebaseConfigured } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
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
  type: 'hint' | 'tile';
  amount: number;
  claimed: boolean;
  createdAt: any;
  expiresAt: any;
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
      await setDoc(
        userRef,
        {
          ...data,
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Firestore] syncPlayerProfile failed:', e);
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
      console.warn('[Firestore] generateFriendCode failed:', e);
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
      console.warn('[Firestore] findUserByFriendCode failed:', e);
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
      console.warn('[Firestore] getDailyLeaderboard failed:', e);
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
      console.warn('[Firestore] getWeeklyLeaderboard failed:', e);
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
      console.warn('[Firestore] getAllTimeLeaderboard failed:', e);
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
    try {
      const today = getTodayDateString();
      const docId = `${userId}_${today}`;
      const docRef = doc(db, 'dailyScores', docId);
      // Only overwrite if the new score is higher
      const existing = await getDoc(docRef);
      if (existing.exists() && existing.data().score >= score) return;
      await setDoc(docRef, {
        userId,
        displayName,
        score,
        stars,
        level,
        date: today,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[Firestore] submitDailyScore failed:', e);
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
    try {
      const weekId = getCurrentWeekId();
      const docId = `${userId}_${weekId}`;
      const docRef = doc(db, 'weeklyScores', docId);
      const existing = await getDoc(docRef);
      const prevScore = existing.exists() ? existing.data().score || 0 : 0;
      await setDoc(docRef, {
        userId,
        displayName,
        score: prevScore + score,
        weekId,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[Firestore] submitWeeklyScore failed:', e);
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
      console.warn('[Firestore] getFriends failed:', e);
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
      console.warn('[Firestore] getPendingFriendRequests failed:', e);
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
      console.warn('[Firestore] addFriend failed:', e);
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
      console.warn('[Firestore] acceptFriendRequest failed:', e);
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
      console.warn('[Firestore] getFriendScores failed:', e);
      return { beaten: 0, total: 0 };
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
      console.warn('[Firestore] sendGift failed:', e);
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
      console.warn('[Firestore] getPendingGifts failed:', e);
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
      console.warn('[Firestore] claimGift failed:', e);
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
        createdAt: serverTimestamp(),
      });
      return clubRef.id;
    } catch (e) {
      console.warn('[Firestore] createClub failed:', e);
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
      console.warn('[Firestore] getClub failed:', e);
      return null;
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
