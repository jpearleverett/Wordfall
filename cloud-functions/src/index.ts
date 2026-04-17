/**
 * Wordfall Cloud Functions
 *
 * Handles:
 * - Club cooperative goal tracking (onPuzzleComplete)
 * - Club leaderboard updates (scheduled hourly)
 * - Push notifications for friend activity, events, streaks
 * - Streak reminders (scheduled daily at 8 PM UTC)
 * - Weekly club goal rotation (scheduled Monday)
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ─── Club Goal Templates ─────────────────────────────────────────────────────

const CLUB_GOAL_TEMPLATES = [
  { id: 'words', label: 'Club Word Hunt', target: 500, trackingKey: 'wordsFound', duration: 7 },
  { id: 'stars', label: 'Star Chasers', target: 100, trackingKey: 'starsEarned', duration: 7 },
  { id: 'perfects', label: 'Perfect Together', target: 20, trackingKey: 'perfectSolves', duration: 7 },
  { id: 'chains', label: 'Chain Masters', target: 50, trackingKey: 'chainsTriggered', duration: 3 },
  { id: 'puzzles', label: 'Puzzle Marathon', target: 200, trackingKey: 'puzzlesSolved', duration: 7 },
  { id: 'score', label: 'Score Surge', target: 50000, trackingKey: 'totalScore', duration: 3 },
  { id: 'nohint', label: 'No-Hint Heroes', target: 30, trackingKey: 'noHintClears', duration: 7 },
  { id: 'combos', label: 'Combo Frenzy', target: 80, trackingKey: 'combosTriggered', duration: 3 },
];

// ─── 1. onPuzzleComplete ─────────────────────────────────────────────────────

/**
 * Triggered when a user completes a puzzle.
 * Updates their club's cooperative goal progress.
 */
export const onPuzzleComplete = functions.firestore
  .document('users/{userId}/puzzleResults/{resultId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const result = snap.data();

    // Get user's club
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();
    if (!userData?.clubId) return;

    const clubId = userData.clubId;

    // Get active club goals
    const goalsSnap = await db
      .collection(`clubs/${clubId}/goals`)
      .where('active', '==', true)
      .get();

    if (goalsSnap.empty) return;

    const batch = db.batch();

    for (const goalDoc of goalsSnap.docs) {
      const goal = goalDoc.data();
      let increment = 0;

      switch (goal.trackingKey) {
        case 'puzzlesSolved':
          increment = 1;
          break;
        case 'wordsFound':
          increment = result.wordsFound ?? 0;
          break;
        case 'starsEarned':
          increment = result.stars ?? 0;
          break;
        case 'perfectSolves':
          increment = result.isPerfect ? 1 : 0;
          break;
        case 'totalScore':
          increment = result.score ?? 0;
          break;
        case 'chainsTriggered':
          increment = result.chainCount ?? 0;
          break;
        case 'noHintClears':
          increment = result.hintsUsed === 0 ? 1 : 0;
          break;
        case 'combosTriggered':
          increment = result.maxCombo > 1 ? 1 : 0;
          break;
      }

      if (increment > 0) {
        batch.update(goalDoc.ref, {
          progress: admin.firestore.FieldValue.increment(increment),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Update club weekly score
    batch.update(db.doc(`clubs/${clubId}`), {
      weeklyScore: admin.firestore.FieldValue.increment(result.score ?? 0),
    });

    await batch.commit();

    // Check if any goals completed
    for (const goalDoc of goalsSnap.docs) {
      const goal = goalDoc.data();
      const currentProgress = (goal.progress ?? 0) + (goal.trackingKey === 'puzzlesSolved' ? 1 : 0);
      if (currentProgress >= goal.target && !goal.completed) {
        await goalDoc.ref.update({ completed: true, completedAt: admin.firestore.FieldValue.serverTimestamp() });

        // Award rewards to all club members
        const membersSnap = await db.collection(`clubs/${clubId}/members`).get();
        const rewardBatch = db.batch();
        for (const memberDoc of membersSnap.docs) {
          rewardBatch.set(db.doc(`users/${memberDoc.id}/rewards/${goalDoc.id}`), {
            type: 'club_goal_complete',
            goalLabel: goal.label,
            coins: goal.rewardCoins ?? 600,
            gems: goal.rewardGems ?? 20,
            claimed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await rewardBatch.commit();
      }
    }
  });

// ─── 2. updateClubLeaderboard ────────────────────────────────────────────────

/**
 * Runs every hour to aggregate club scores and update leaderboard rankings.
 */
export const updateClubLeaderboard = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const clubsSnap = await db.collection('clubs').orderBy('weeklyScore', 'desc').limit(100).get();

    const entries: Array<{ clubId: string; name: string; score: number; rank: number; tier: string }> = [];

    clubsSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      const rank = index + 1;
      let tier = 'bronze';
      if (rank <= 3) tier = 'diamond';
      else if (rank <= 10) tier = 'gold';
      else if (rank <= 25) tier = 'silver';

      entries.push({
        clubId: doc.id,
        name: data.name ?? 'Unknown Club',
        score: data.weeklyScore ?? 0,
        rank,
        tier,
      });

      // Update club tier
      doc.ref.update({ tier, leaderboardRank: rank });
    });

    // Write leaderboard snapshot
    await db.doc('leaderboards/clubs_weekly').set({
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// ─── 3. sendPushNotification ─────────────────────────────────────────────────

/**
 * HTTPS callable function to send push notifications.
 * Used for friend activity, event reminders, and streak warnings.
 */
// Simple in-memory token bucket to mitigate push spam per sender UID.
// Survives within a warm invocation; Firestore-backed rate limiting is a v1.1 item.
const PUSH_RATE_LIMIT_PER_MIN = 30;
const pushRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkPushRateLimit(uid: string): boolean {
  const now = Date.now();
  const bucket = pushRateBuckets.get(uid);
  if (!bucket || now > bucket.resetAt) {
    pushRateBuckets.set(uid, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= PUSH_RATE_LIMIT_PER_MIN) return false;
  bucket.count += 1;
  return true;
}

/**
 * Firestore-backed per-UID rate limit (token-bucket w/ fixed time window).
 *
 * In-memory limits (`pushRateBuckets`) only bind one function instance; a
 * caller that fans out across cold starts can burst past the limit. This
 * backs every call with a tiny Firestore counter at
 * `rateLimits/{uid}_{endpoint}_{windowStart}`, incremented atomically, TTL
 * via `expiresAt`. Callers should still run the in-memory check first as a
 * fast-path — Firestore is only consulted if memory says ok.
 *
 * Docs are ~80 bytes; at 30 req/min/user worst-case that's ~3 MB / 100k DAU /
 * day, deleted daily by the scheduled cleanup.
 *
 * Returns true if the request is within budget, false if over.
 */
async function checkFirestoreRateLimit(
  uid: string,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds;
  const docId = `${uid}_${endpoint}_${windowStart}`;
  const ref = db.collection('rateLimits').doc(docId);
  try {
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.exists ? (snap.data()?.count as number) : 0) ?? 0;
      if (current >= limit) return current + 1;
      tx.set(
        ref,
        {
          uid,
          endpoint,
          count: admin.firestore.FieldValue.increment(1),
          windowStart,
          expiresAt: admin.firestore.Timestamp.fromMillis(
            (windowStart + windowSeconds) * 1000 + 60_000,
          ),
        },
        { merge: true },
      );
      return current + 1;
    });
    return next <= limit;
  } catch (err) {
    // Fail open so Firestore hiccups don't black out legit traffic — the
    // in-memory bucket + abuse monitoring above still provide coverage.
    console.warn('[rateLimit] Firestore check failed, allowing:', err);
    return true;
  }
}

/**
 * Check whether the authenticated sender has an existing relationship
 * (friendship, club co-membership) with the target user, authorizing a push.
 */
async function canSendPushTo(senderUid: string, targetUid: string): Promise<boolean> {
  if (senderUid === targetUid) return true;

  // Friendship: a doc in `friendships` with both UIDs in `users` array
  try {
    const friendshipSnap = await db
      .collection('friendships')
      .where('users', 'array-contains', senderUid)
      .get();
    for (const doc of friendshipSnap.docs) {
      const users = (doc.data().users as string[]) ?? [];
      if (users.includes(targetUid)) return true;
    }
  } catch {
    // fall through
  }

  // Club co-membership: sender and target share a club
  try {
    const clubsSnap = await db
      .collection('clubs')
      .where('memberIds', 'array-contains', senderUid)
      .get();
    for (const doc of clubsSnap.docs) {
      const memberIds = (doc.data().memberIds as string[]) ?? [];
      if (memberIds.includes(targetUid)) return true;
    }
  } catch {
    // fall through
  }

  return false;
}

export const sendPushNotification = functions.https.onCall(
  async (
    data: { userId: string; title: string; body: string; data?: Record<string, string> },
    context,
  ) => {
    // SECURITY: Require authentication.
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const senderUid = context.auth.uid;

    const { userId, title, body } = data;
    if (!userId || typeof title !== 'string' || typeof body !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: userId, title, body',
      );
    }

    // Bound payload sizes to prevent abuse
    if (title.length > 100 || body.length > 500) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'title/body too long',
      );
    }

    // Per-sender rate limit — in-memory fast path, then durable Firestore
    // check that survives cold starts / instance fan-out.
    if (!checkPushRateLimit(senderUid)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many push requests — try again in a minute',
      );
    }
    const withinDurableBudget = await checkFirestoreRateLimit(
      senderUid,
      'sendPushNotification',
      PUSH_RATE_LIMIT_PER_MIN,
      60,
    );
    if (!withinDurableBudget) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many push requests — try again in a minute',
      );
    }

    // Relationship gate: only friends / club co-members (or self) can push
    const authorized = await canSendPushTo(senderUid, userId);
    if (!authorized) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'No existing relationship with target user',
      );
    }

    // Get user's push token
    const tokenDoc = await db.doc(`users/${userId}/pushToken/current`).get();
    const tokenData = tokenDoc.data();
    if (!tokenData?.token) return { success: false, reason: 'no_token' };

    try {
      // Use Expo push notification service
      const { Expo } = await import('expo-server-sdk');
      const expo = new Expo();

      if (!Expo.isExpoPushToken(tokenData.token)) {
        return { success: false, reason: 'invalid_token' };
      }

      const [ticket] = await expo.sendPushNotificationsAsync([
        {
          to: tokenData.token,
          title,
          body,
          data: data.data ?? {},
          sound: 'default',
          priority: 'high',
        },
      ]);

      return { success: true, ticketId: (ticket as any).id };
    } catch (error) {
      console.error('Push notification failed:', error);
      return { success: false, reason: 'send_failed' };
    }
  },
);

// ─── 4. processStreakReminders ────────────────────────────────────────────────

/**
 * Runs daily at 8 PM UTC to send streak reminders to active players.
 */
export const processStreakReminders = functions.pubsub
  .schedule('0 20 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const today = new Date().toISOString().split('T')[0];

    // Find users with active streaks who haven't played today
    const usersSnap = await db
      .collection('users')
      .where('streaks.currentStreak', '>', 0)
      .limit(500) // Process in batches
      .get();

    let notificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const lastPlayDate = userData.streaks?.lastPlayDate;

      if (lastPlayDate === today) continue; // Already played today

      // Get push token
      const tokenDoc = await db.doc(`users/${userDoc.id}/pushToken/current`).get();
      const tokenData = tokenDoc.data();
      if (!tokenData?.token) continue;

      const streakDays = userData.streaks?.currentStreak ?? 0;

      try {
        const { Expo } = await import('expo-server-sdk');
        const expo = new Expo();

        if (Expo.isExpoPushToken(tokenData.token)) {
          await expo.sendPushNotificationsAsync([
            {
              to: tokenData.token,
              title: `${streakDays}-day streak at risk!`,
              body: `Don't lose your ${streakDays}-day streak! Complete a puzzle to keep it going.`,
              data: { type: 'streak_reminder' },
              sound: 'default',
            },
          ]);
          notificationsSent++;
        }
      } catch (e) {
        console.error(`Failed to send streak reminder to ${userDoc.id}:`, e);
      }
    }

    console.log(`Sent ${notificationsSent} streak reminders`);
  });

// ─── 5. rotateClubGoals ──────────────────────────────────────────────────────

/**
 * Runs weekly on Monday at midnight UTC to rotate club goals.
 */
export const rotateClubGoals = functions.pubsub
  .schedule('0 0 * * 1')
  .timeZone('UTC')
  .onRun(async () => {
    const clubsSnap = await db.collection('clubs').get();

    for (const clubDoc of clubsSnap.docs) {
      const batch = db.batch();

      // Archive old goals
      const oldGoals = await db
        .collection(`clubs/${clubDoc.id}/goals`)
        .where('active', '==', true)
        .get();

      for (const goalDoc of oldGoals.docs) {
        batch.update(goalDoc.ref, { active: false, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
      }

      // Pick 2 random new goals
      const shuffled = [...CLUB_GOAL_TEMPLATES].sort(() => Math.random() - 0.5);
      const newGoals = shuffled.slice(0, 2);

      for (const template of newGoals) {
        const goalRef = db.collection(`clubs/${clubDoc.id}/goals`).doc();
        batch.set(goalRef, {
          ...template,
          active: true,
          progress: 0,
          completed: false,
          rewardCoins: template.duration <= 3 ? 300 : 600,
          rewardGems: template.duration <= 3 ? 10 : 20,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + template.duration * 24 * 60 * 60 * 1000),
        });
      }

      // Reset weekly score
      batch.update(clubDoc.ref, { weeklyScore: 0 });

      await batch.commit();
    }

    console.log(`Rotated goals for ${clubsSnap.size} clubs`);
  });

// ─── Server-side profanity filter ────────────────────────────────────────────

// Mirrors src/utils/profanityFilter.ts. Kept as a duplicate copy here because
// Cloud Functions need a standalone module with no React Native deps.
const PROFANE_WORDS_SERVER: string[] = [
  'ass', 'asshole', 'bastard', 'bitch', 'bloody', 'bollocks', 'bullshit',
  'crap', 'cunt', 'damn', 'dick', 'douche', 'dumbass', 'fag', 'faggot',
  'fuck', 'fucking', 'fucker', 'goddamn', 'hell', 'idiot', 'jackass',
  'jerk', 'moron', 'motherfucker', 'nigger', 'nigga', 'piss', 'prick',
  'pussy', 'retard', 'retarded', 'shit', 'shitty', 'slut', 'stfu',
  'stupid', 'twat', 'wanker', 'whore', 'wtf',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serverFilterProfanity(text: string): string {
  let out = text;
  const lower = text.toLowerCase();
  for (const word of PROFANE_WORDS_SERVER) {
    const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      out = out.substring(0, start) + '*'.repeat(match[0].length) + out.substring(end);
    }
  }
  return out;
}

/**
 * moderateClubMessage — onCreate trigger
 *
 * Runs server-side after a message is written. Filters profanity so that a
 * modified client cannot bypass the client-side filter. Also caps length
 * defensively in case rule validation is ever relaxed.
 */
export const moderateClubMessage = functions.firestore
  .document('clubs/{clubId}/messages/{messageId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    const original: string = data?.message ?? '';
    if (!original) return;

    const capped = original.slice(0, 200);
    const filtered = serverFilterProfanity(capped);

    if (filtered !== original) {
      try {
        await snap.ref.update({
          message: filtered,
          filteredByServer: true,
          filteredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn('[moderateClubMessage] update failed', e);
      }
    }
  });

// ─── 7. sendGift / claimGift (social gifting) ────────────────────────────────
//
// The existing client-direct gifting path in firestoreService.sendGift writes
// straight to the `gifts/` collection with fields
// { fromUserId, toUserId, type, amount, claimed, createdAt, expiresAt }. That
// path is convenient but has no rate-limit, no idempotency, and is spammable
// by a modified client. The callables below are the secure authoritative
// path: atomic txn, 5/day sender cap, idempotency key. They write the SAME
// schema so the existing fetchUnclaimedGifts + claim UI keep working.

/**
 * Per-sender daily gift cap. 5/day prevents spam while leaving enough
 * headroom for normal club play. Counter resets at UTC midnight via
 * date-keyed doc id.
 */
const GIFT_DAILY_CAP_PER_SENDER = 5;

type GiftType = 'hint' | 'tile' | 'life';
const ALLOWED_GIFT_TYPES: readonly GiftType[] = ['hint', 'tile', 'life'] as const;
const GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

/**
 * sendGift — HTTPS Callable
 *
 * Debits sender's daily gift quota + writes a pending gift doc. All writes
 * occur in one transaction so double-calls with the same idempotencyKey are
 * safe: a repeat short-circuits without changing quota or duplicating rows.
 *
 * The server never writes to the recipient's economy doc; the recipient's
 * client applies the grant locally after claimGift flips `claimed`, which
 * keeps all economy writes client-driven (same pattern as every other
 * currency mutation) and works in offline/flaky-network cases.
 */
export const sendGift = functions.https.onCall(
  async (
    data: {
      toUserId: string;
      type: GiftType;
      amount?: number;
      fromDisplayName?: string;
      idempotencyKey: string;
    },
    context,
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required',
      );
    }
    const fromUserId = context.auth.uid;
    const {
      toUserId,
      type,
      amount = 1,
      fromDisplayName = 'A friend',
      idempotencyKey,
    } = data ?? ({} as typeof data);

    if (
      typeof toUserId !== 'string' ||
      toUserId.length === 0 ||
      toUserId.length > 128
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid toUserId');
    }
    if (!ALLOWED_GIFT_TYPES.includes(type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid gift type');
    }
    if (typeof amount !== 'number' || amount < 1 || amount > 5) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'amount must be 1..5',
      );
    }
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid idempotencyKey');
    }
    if (fromUserId === toUserId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Cannot send a gift to yourself',
      );
    }

    // Reuse the relationship check that guards push notifications — gifts
    // must be between clubmates or friends.
    const related = await canSendPushTo(fromUserId, toUserId);
    if (!related) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Recipient is not a clubmate or friend',
      );
    }

    const day = todayKey();
    const giftRef = db.collection('gifts').doc(idempotencyKey);
    const quotaRef = db
      .collection('users')
      .doc(fromUserId)
      .collection('giftQuota')
      .doc(day);

    return db.runTransaction(async (tx) => {
      const existing = await tx.get(giftRef);
      if (existing.exists) {
        // Idempotent replay — return cached state without double-debiting quota.
        const prev = existing.data() ?? {};
        return {
          success: true,
          giftId: idempotencyKey,
          alreadySent: true,
          claimed: Boolean(prev.claimed),
        };
      }

      const quotaSnap = await tx.get(quotaRef);
      const sentToday = (quotaSnap.data()?.count as number) ?? 0;
      if (sentToday >= GIFT_DAILY_CAP_PER_SENDER) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Daily gift limit reached (${GIFT_DAILY_CAP_PER_SENDER}/day)`,
        );
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + GIFT_EXPIRY_MS,
      );

      tx.set(giftRef, {
        fromUserId,
        fromDisplayName,
        toUserId,
        type,
        amount,
        claimed: false,
        createdAt: now,
        expiresAt,
      });
      tx.set(
        quotaRef,
        {
          count: admin.firestore.FieldValue.increment(1),
          day,
          updatedAt: now,
        },
        { merge: true },
      );

      return { success: true, giftId: idempotencyKey, alreadySent: false, claimed: false };
    });
  },
);

/**
 * claimGift — HTTPS Callable
 *
 * Called by the recipient's client after applying the gift locally (adding
 * a life / hint via EconomyContext). Flips `claimed: true` so the gift stops
 * appearing in the unread inbox. Server never writes to the client's economy
 * doc; this is only a state-machine transition + audit trail.
 */
export const claimGift = functions.https.onCall(
  async (data: { giftId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required',
      );
    }
    const claimerUid = context.auth.uid;
    const giftId = data?.giftId;

    if (typeof giftId !== 'string' || giftId.length < 1 || giftId.length > 128) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid giftId');
    }

    const giftRef = db.collection('gifts').doc(giftId);

    return db.runTransaction(async (tx) => {
      const giftSnap = await tx.get(giftRef);
      if (!giftSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Gift not found');
      }
      const gift = giftSnap.data()!;
      if (gift.toUserId !== claimerUid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only the recipient may claim this gift',
        );
      }
      if (gift.claimed === true) {
        return {
          success: true,
          type: gift.type as GiftType,
          amount: (gift.amount as number) ?? 1,
          alreadyClaimed: true,
        };
      }

      tx.update(giftRef, {
        claimed: true,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {
        success: true,
        type: gift.type as GiftType,
        amount: (gift.amount as number) ?? 1,
        alreadyClaimed: false,
      };
    });
  },
);


