/**
 * Wordfall Cloud Functions — social codebase (merged into functions/ in v1.1).
 *
 * Handles:
 * - Club cooperative goal tracking (onPuzzleComplete)
 * - Club leaderboard updates (scheduled hourly)
 * - Push notifications for friend activity, events, streaks
 * - Streak reminders (scheduled daily at 8 PM UTC)
 * - Weekly club goal rotation (scheduled Monday)
 * - Secure gifting (sendGift / claimGift)
 * - Moderation (moderateClubMessage — Perspective API)
 *
 * `admin.initializeApp()` is called exactly once in ./index.ts; this file
 * imports the shared firestore() handle via that initialization. Every
 * `const db = admin.firestore()` returns the same singleton so this is
 * safe even though both files create their own local reference.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// admin.initializeApp() is called from ./index.ts — do NOT re-init here;
// a second initializeApp() throws "The default Firebase app already exists".
const db = admin.firestore();

// ─── Club Goal Templates ─────────────────────────────────────────────────────
//
// `mode: 'personal'` (default) — every member tracks their own progress and
//   claims their own reward when their local count crosses the target.
// `mode: 'shared'` — the whole club contributes to ONE progress bar; when it
//   crosses target, every member receives a reward doc. Shared goals live at
//   clubs/{clubId}/sharedGoals/{goalId} (not the per-member `goals/` tree).

type ClubGoalMode = 'personal' | 'shared';

interface ClubGoalTemplate {
  id: string;
  label: string;
  target: number;
  trackingKey: string;
  duration: number;
  mode: ClubGoalMode;
}

const CLUB_GOAL_TEMPLATES: ClubGoalTemplate[] = [
  // Personal goals — existing catalog
  { id: 'words', label: 'Club Word Hunt', target: 500, trackingKey: 'wordsFound', duration: 7, mode: 'personal' },
  { id: 'stars', label: 'Star Chasers', target: 100, trackingKey: 'starsEarned', duration: 7, mode: 'personal' },
  { id: 'perfects', label: 'Perfect Together', target: 20, trackingKey: 'perfectSolves', duration: 7, mode: 'personal' },
  { id: 'chains', label: 'Chain Masters', target: 50, trackingKey: 'chainsTriggered', duration: 3, mode: 'personal' },
  { id: 'puzzles', label: 'Puzzle Marathon', target: 200, trackingKey: 'puzzlesSolved', duration: 7, mode: 'personal' },
  { id: 'score', label: 'Score Surge', target: 50000, trackingKey: 'totalScore', duration: 3, mode: 'personal' },
  { id: 'nohint', label: 'No-Hint Heroes', target: 30, trackingKey: 'noHintClears', duration: 7, mode: 'personal' },
  { id: 'combos', label: 'Combo Frenzy', target: 80, trackingKey: 'combosTriggered', duration: 3, mode: 'personal' },
  // Shared goals — Clash-of-Clans style collective progress
  { id: 'shared_cascade', label: 'Club Cascade Challenge', target: 100, trackingKey: 'chainsTriggered', duration: 7, mode: 'shared' },
  { id: 'shared_marathon', label: 'Word Marathon', target: 5000, trackingKey: 'wordsFound', duration: 7, mode: 'shared' },
  { id: 'shared_squad', label: 'Perfect Squad', target: 50, trackingKey: 'perfectSolves', duration: 7, mode: 'shared' },
];

// ─── 1. onPuzzleComplete ─────────────────────────────────────────────────────

/**
 * Triggered when a user completes a puzzle.
 * Updates their club's cooperative goal progress.
 */
function computeGoalIncrement(
  trackingKey: string,
  result: admin.firestore.DocumentData,
): number {
  switch (trackingKey) {
    case 'puzzlesSolved':
      return 1;
    case 'wordsFound':
      return result.wordsFound ?? 0;
    case 'starsEarned':
      return result.stars ?? 0;
    case 'perfectSolves':
      return result.isPerfect ? 1 : 0;
    case 'totalScore':
      return result.score ?? 0;
    case 'chainsTriggered':
      return result.chainCount ?? 0;
    case 'noHintClears':
      return result.hintsUsed === 0 ? 1 : 0;
    case 'combosTriggered':
      return (result.maxCombo ?? 0) > 1 ? 1 : 0;
    default:
      return 0;
  }
}

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

    // Personal (per-member) goals and shared (cluster-level) goals live in
    // two separate subcollections — fetch both concurrently.
    const [personalSnap, sharedSnap] = await Promise.all([
      db.collection(`clubs/${clubId}/goals`).where('active', '==', true).get(),
      db.collection(`clubs/${clubId}/sharedGoals`).where('active', '==', true).get(),
    ]);

    if (personalSnap.empty && sharedSnap.empty) return;

    const batch = db.batch();

    for (const goalDoc of personalSnap.docs) {
      const goal = goalDoc.data();
      const increment = computeGoalIncrement(goal.trackingKey, result);
      if (increment > 0) {
        batch.update(goalDoc.ref, {
          progress: admin.firestore.FieldValue.increment(increment),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    for (const goalDoc of sharedSnap.docs) {
      const goal = goalDoc.data();
      const increment = computeGoalIncrement(goal.trackingKey, result);
      if (increment > 0) {
        batch.update(goalDoc.ref, {
          progress: admin.firestore.FieldValue.increment(increment),
          [`memberContributions.${userId}`]:
            admin.firestore.FieldValue.increment(increment),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Update club weekly score
    batch.update(db.doc(`clubs/${clubId}`), {
      weeklyScore: admin.firestore.FieldValue.increment(result.score ?? 0),
    });

    await batch.commit();

    // Personal goal completion — reward the single member whose count
    // crossed the target (preserved legacy behaviour: the batch above only
    // increments once per puzzle so the post-write snapshot is authoritative).
    for (const goalDoc of personalSnap.docs) {
      const goal = goalDoc.data();
      const inc = computeGoalIncrement(goal.trackingKey, result);
      const currentProgress = (goal.progress ?? 0) + inc;
      if (currentProgress >= goal.target && !goal.completed) {
        await goalDoc.ref.update({
          completed: true,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

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

    // Shared goal completion — guard against races by flipping `completed`
    // inside a transaction and enumerating memberIds from the CLUB doc (not
    // a subcollection) so late-joining members don't get retroactive rewards.
    for (const goalDoc of sharedSnap.docs) {
      const goal = goalDoc.data();
      if (goal.completed) continue;
      const inc = computeGoalIncrement(goal.trackingKey, result);
      const projectedProgress = (goal.progress ?? 0) + inc;
      if (projectedProgress < goal.target) continue;

      const claimedMembers = await db.runTransaction(async (tx) => {
        const freshGoal = await tx.get(goalDoc.ref);
        const data = freshGoal.data();
        if (!data || data.completed) return null;
        if ((data.progress ?? 0) < data.target) return null;

        const clubRef = db.doc(`clubs/${clubId}`);
        const clubSnap = await tx.get(clubRef);
        const memberIds = (clubSnap.data()?.memberIds as string[]) ?? [];

        tx.update(goalDoc.ref, {
          completed: true,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          finalMemberIds: memberIds,
        });
        return memberIds;
      });

      if (!claimedMembers || claimedMembers.length === 0) continue;

      const rewardBatch = db.batch();
      for (const memberId of claimedMembers) {
        rewardBatch.set(
          db.doc(`users/${memberId}/rewards/sharedgoal_${goalDoc.id}`),
          {
            type: 'shared_goal_complete',
            goalId: goalDoc.id,
            goalLabel: goal.label,
            coins: goal.rewardCoins ?? 800,
            gems: goal.rewardGems ?? 30,
            claimed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        );
      }
      await rewardBatch.commit();
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
    functions.logger.warn('[rateLimit] Firestore check failed, allowing:', err);
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

/**
 * Module-private helper: send an Expo push to a single user by UID.
 *
 * Used by (a) the authenticated `sendPushNotification` callable (wraps this
 * with rate-limiting + relationship-gating) and (b) server-initiated pushes
 * from scheduled/triggered functions (`onReferralSuccess`, streak reminders,
 * etc.) where the sender is the system, not another user.
 *
 * Returns a structured result rather than throwing — callers decide how to
 * handle "no token" / "invalid token" / "send failed". Unexpected errors are
 * logged via `functions.logger` and swallowed (returned as `send_failed`) so
 * that push failures never roll back the calling function's primary work.
 */
async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ success: boolean; reason?: string; ticketId?: string }> {
  try {
    const tokenDoc = await db.doc(`users/${userId}/pushToken/current`).get();
    const tokenData = tokenDoc.data();
    if (!tokenData?.token) return { success: false, reason: 'no_token' };

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
        data: (data as Record<string, string> | undefined) ?? {},
        sound: 'default',
        priority: 'high',
      },
    ]);

    return { success: true, ticketId: (ticket as { id?: string }).id };
  } catch (error) {
    functions.logger.error('[sendPushToUser] failed', { userId, error });
    return { success: false, reason: 'send_failed' };
  }
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

    return sendPushToUser(userId, title, body, data.data);
  },
);

// ─── 4. processStreakReminders ────────────────────────────────────────────────

/**
 * Runs daily at 8 PM UTC to send streak reminders to active players.
 *
 * Scans the `users` collection in paginated batches of 500 so DAU > 50k
 * doesn't drop the tail. Inter-batch sleep keeps us well under Firestore's
 * per-second read quota. Function-wide time budget guard ensures we never
 * exceed the 540s Cloud Function timeout even in pathological scans.
 */
const STREAK_REMINDER_BATCH_SIZE = 500;
const STREAK_REMINDER_BATCH_SLEEP_MS = 1000;
const STREAK_REMINDER_TIME_BUDGET_MS = 9 * 60 * 1000; // leave ~60s headroom
/** The local hour we target for streak reminders (player's timezone). */
const STREAK_REMINDER_TARGET_LOCAL_HOUR = 20; // 8 PM local

/**
 * Compute the local hour (0–23) for a user given their stored tzOffsetMinutes.
 * `tzOffsetMinutes` follows the Date#getTimezoneOffset convention except
 * inverted to match Expo's `Localization.getCalendars()[0].timeZoneOffsetMinutes`
 * (positive east of UTC). Users who never sent a tzOffset fall back to UTC,
 * which means they'll still get the reminder at 20:00 UTC (the old behavior).
 */
function localHourForUser(tzOffsetMinutes: number | undefined | null, nowMs: number): number {
  const offsetMin = typeof tzOffsetMinutes === 'number' ? tzOffsetMinutes : 0;
  const localMs = nowMs + offsetMin * 60 * 1000;
  return new Date(localMs).getUTCHours();
}

export const processStreakReminders = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  // R2 in launch_blockers.md: run every hour so we can bucket users by their
  // local 8 PM. Each hour we only push to users whose local time is currently
  // 20:00. Users without a recorded tzOffset still get the 20:00 UTC push.
  .pubsub.schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const nowMs = Date.now();
    const today = new Date(nowMs).toISOString().split('T')[0];
    const startedAt = nowMs;

    let notificationsSent = 0;
    let scanned = 0;
    let skippedByTz = 0;
    let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    while (Date.now() - startedAt < STREAK_REMINDER_TIME_BUDGET_MS) {
      let query = db
        .collection('users')
        .where('streaks.currentStreak', '>', 0)
        .orderBy('streaks.currentStreak')
        .limit(STREAK_REMINDER_BATCH_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      const usersSnap = await query.get();
      if (usersSnap.empty) break;

      for (const userDoc of usersSnap.docs) {
        scanned++;
        const userData = userDoc.data();
        const lastPlayDate = userData.streaks?.lastPlayDate;
        if (lastPlayDate === today) continue; // Already played today

        // Per-timezone send window: only push when the user's local hour is 20:00.
        const userHour = localHourForUser(userData.tzOffsetMinutes, nowMs);
        if (userHour !== STREAK_REMINDER_TARGET_LOCAL_HOUR) {
          skippedByTz++;
          continue;
        }

        const streakDays = userData.streaks?.currentStreak ?? 0;

        const result = await sendPushToUser(
          userDoc.id,
          `${streakDays}-day streak at risk!`,
          `Don't lose your ${streakDays}-day streak! Complete a puzzle to keep it going.`,
          { type: 'streak_reminder' },
        );
        if (result.success) notificationsSent++;
      }

      if (usersSnap.size < STREAK_REMINDER_BATCH_SIZE) break;
      lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
      await new Promise((r) => setTimeout(r, STREAK_REMINDER_BATCH_SLEEP_MS));
    }

    functions.logger.info('[processStreakReminders] sent reminders', {
      notificationsSent,
      scanned,
      skippedByTz,
      hourUtc: new Date(nowMs).getUTCHours(),
      durationMs: Date.now() - startedAt,
    });
  });

// ─── 4b. processDay2Reengagement / processDay7Reengagement ──────────────────
//
// R3 + R4 in launch_blockers.md: push lapsed users back into the game
// before D7 churn compounds. Both functions share the same structure —
// hourly cron, per-timezone bucketed at 19:00 local, targets users whose
// `lastActiveDate` equals exactly today - Δ days.
//
// The offer side is already wired: when a Day-2/Day-7 returnee opens the
// app, `dynamicPricing.ts:103-250` returns the segment-appropriate
// discount ("WELCOME BACK" 70% off starter for lapsed, etc.). These
// functions only trigger the push; the economy does the rest.

const REENG_BATCH_SIZE = 500;
const REENG_BATCH_SLEEP_MS = 1000;
const REENG_TIME_BUDGET_MS = 9 * 60 * 1000;
const REENG_TARGET_LOCAL_HOUR = 19; // 7 PM local — bucket for both D2 + D7

function dateDaysAgo(nowMs: number, days: number): string {
  return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function runReengagementPass(opts: {
  daysAgo: number;
  title: string;
  body: string;
  notificationType: string;
  /** Extra per-user skip predicate (e.g. skip if already converted). */
  extraSkip?: (userData: FirebaseFirestore.DocumentData) => boolean;
}): Promise<void> {
  const { daysAgo, title, body, notificationType, extraSkip } = opts;
  const nowMs = Date.now();
  const startedAt = nowMs;
  const targetDate = dateDaysAgo(nowMs, daysAgo);

  let sent = 0;
  let scanned = 0;
  let skippedByTz = 0;
  let skippedByExtra = 0;
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  while (Date.now() - startedAt < REENG_TIME_BUDGET_MS) {
    let query = db
      .collection('users')
      .where('lastActiveDate', '==', targetDate)
      .limit(REENG_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const usersSnap = await query.get();
    if (usersSnap.empty) break;

    for (const userDoc of usersSnap.docs) {
      scanned++;
      const userData = userDoc.data();

      // Per-timezone send window — align with streak reminder semantics.
      const userHour = localHourForUser(userData.tzOffsetMinutes, nowMs);
      if (userHour !== REENG_TARGET_LOCAL_HOUR) {
        skippedByTz++;
        continue;
      }

      if (extraSkip && extraSkip(userData)) {
        skippedByExtra++;
        continue;
      }

      const result = await sendPushToUser(userDoc.id, title, body, {
        type: notificationType,
      });
      if (result.success) sent++;
    }

    if (usersSnap.size < REENG_BATCH_SIZE) break;
    lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
    await new Promise((r) => setTimeout(r, REENG_BATCH_SLEEP_MS));
  }

  functions.logger.info(`[reengagement:${notificationType}] complete`, {
    daysAgo,
    sent,
    scanned,
    skippedByTz,
    skippedByExtra,
    targetDate,
    durationMs: Date.now() - startedAt,
  });
}

export const processDay2Reengagement = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await runReengagementPass({
      daysAgo: 2,
      title: 'Come back, 2× coins waiting',
      body: 'Your puzzle board is waiting. Tap to pick up where you left off.',
      notificationType: 'day2_reengagement',
      // Target non-payers: first-purchase offer on return is more effective.
      extraSkip: (u) => Array.isArray(u.purchaseHistory) && u.purchaseHistory.length > 0,
    });
  });

export const processDay7Reengagement = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    await runReengagementPass({
      daysAgo: 7,
      title: 'We miss you — your spot is saved',
      body: 'Special welcome-back offer inside. Open to claim.',
      notificationType: 'day7_reengagement',
    });
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

    const personalTemplates = CLUB_GOAL_TEMPLATES.filter((t) => t.mode === 'personal');
    const sharedTemplates = CLUB_GOAL_TEMPLATES.filter((t) => t.mode === 'shared');

    for (const clubDoc of clubsSnap.docs) {
      const batch = db.batch();

      // Archive old personal goals
      const oldPersonal = await db
        .collection(`clubs/${clubDoc.id}/goals`)
        .where('active', '==', true)
        .get();
      for (const goalDoc of oldPersonal.docs) {
        batch.update(goalDoc.ref, {
          active: false,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Archive old shared goals
      const oldShared = await db
        .collection(`clubs/${clubDoc.id}/sharedGoals`)
        .where('active', '==', true)
        .get();
      for (const goalDoc of oldShared.docs) {
        batch.update(goalDoc.ref, {
          active: false,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2 personal + 1 shared per week
      const shuffledPersonal = [...personalTemplates].sort(() => Math.random() - 0.5);
      const shuffledShared = [...sharedTemplates].sort(() => Math.random() - 0.5);
      const newPersonal = shuffledPersonal.slice(0, 2);
      const newShared = shuffledShared.slice(0, 1);

      for (const template of newPersonal) {
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

      for (const template of newShared) {
        const goalRef = db.collection(`clubs/${clubDoc.id}/sharedGoals`).doc();
        batch.set(goalRef, {
          ...template,
          active: true,
          progress: 0,
          completed: false,
          memberContributions: {},
          // Shared goals reward the whole club — bump vs personal so the
          // incentive matches the higher target.
          rewardCoins: 800,
          rewardGems: 30,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + template.duration * 24 * 60 * 60 * 1000),
        });
      }

      // Reset weekly score
      batch.update(clubDoc.ref, { weeklyScore: 0 });

      await batch.commit();
    }

    functions.logger.info('[rotateClubGoals] rotated goals', {
      clubsProcessed: clubsSnap.size,
    });
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
        functions.logger.warn('[moderateClubMessage] update failed', e);
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

/**
 * Returns a stable day bucket derived from fixed 24h ms windows since epoch.
 *
 * Using ms-floor (vs. UTC date-string) keeps bucketing aligned with the
 * `checkFirestoreRateLimit` helper (which also uses ms-floor) and is immune
 * to locale/Date formatting quirks. The bucket rolls over at the same instant
 * for every caller worldwide.
 */
function dailyBucketKey(): string {
  const bucket = Math.floor(Date.now() / 86_400_000);
  return `d${bucket}`;
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

    const day = dailyBucketKey();
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


// ─── Referral Reward Grant ───────────────────────────────────────────────────

/**
 * Per-referrer daily grant cap. Someone could scrape codes + spin up fake
 * Google Play install accounts to farm rewards; 50/day keeps a viable viral
 * loop while bounding the attack surface.
 */
const REFERRAL_DAILY_CAP_PER_REFERRER = 50;

/**
 * Referral reward defaults. Remote Config is the source of truth at runtime,
 * but server-side RC reads would add a cold-start dependency; instead we
 * mirror the client defaults here. Tuning both in lockstep is a launch
 * checklist item.
 */
const REFERRAL_REWARD_GEMS_REFERRER = 25;
const REFERRAL_REWARD_GEMS_REFERRED = 10;
const REFERRAL_REWARD_COINS_REFERRER = 500;
const REFERRAL_REWARD_COINS_REFERRED = 200;
const REFERRAL_REWARD_HINTS_REFERRED = 3;

/**
 * onReferralSuccess — HTTPS Callable
 *
 * Called by the referred user (the callee) after they complete their first
 * puzzle. Credits both sides of the referral:
 *   - Referrer:  +25 gems, +500 coins, referralCount++, push notification
 *   - Referred:  +10 gems, +200 coins, +3 hint tokens
 *
 * Both reward grants are written to `users/{uid}/rewards/referral_{ts}` with
 * `{ claimed: false }` and applied locally when the inbox claim button is
 * tapped — same pattern as gifts, clubGoals, so offline/flaky-network works.
 *
 * Double-claim guard: a dedup doc at
 * `referrals/{referredUid}_{referralCode}` blocks replays at the transaction
 * layer. Per-referrer daily rate limit caps abuse.
 */
export const onReferralSuccess = functions.https.onCall(
  async (data: { referralCode: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required',
      );
    }
    const referredUid = context.auth.uid;
    const { referralCode } = data ?? ({} as typeof data);

    if (
      typeof referralCode !== 'string' ||
      referralCode.length < 4 ||
      referralCode.length > 16
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid referralCode',
      );
    }

    // Look up referrer UID via the referralCodes index (written client-side
    // on first generate). Missing doc = legacy / unregistered code — reject.
    const codeRef = db.collection('referralCodes').doc(referralCode.toUpperCase());
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Referral code not found');
    }
    const referrerUid = codeSnap.data()?.uid as string | undefined;
    if (!referrerUid || typeof referrerUid !== 'string') {
      throw new functions.https.HttpsError('failed-precondition', 'Malformed referralCodes doc');
    }
    if (referrerUid === referredUid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Self-referral is not allowed',
      );
    }

    // Per-referrer daily rate limit (spam cap).
    const withinBudget = await checkFirestoreRateLimit(
      referrerUid,
      'onReferralSuccess',
      REFERRAL_DAILY_CAP_PER_REFERRER,
      24 * 60 * 60,
    );
    if (!withinBudget) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Referrer has reached the daily referral grant cap (${REFERRAL_DAILY_CAP_PER_REFERRER}/day)`,
      );
    }

    const dedupId = `${referredUid}_${referralCode.toUpperCase()}`;
    const dedupRef = db.collection('referrals').doc(dedupId);

    const timestamp = Date.now();
    const referrerRewardRef = db
      .collection('users')
      .doc(referrerUid)
      .collection('rewards')
      .doc(`referral_${timestamp}_${referredUid.slice(0, 8)}`);
    const referredRewardRef = db
      .collection('users')
      .doc(referredUid)
      .collection('rewards')
      .doc(`referral_${timestamp}`);

    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(dedupRef);
      if (existing.exists) {
        return { alreadyGranted: true as const };
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(dedupRef, {
        referrerUid,
        referredUid,
        referralCode: referralCode.toUpperCase(),
        createdAt: now,
      });

      tx.set(referrerRewardRef, {
        type: 'referral',
        lane: 'referrer',
        gems: REFERRAL_REWARD_GEMS_REFERRER,
        coins: REFERRAL_REWARD_COINS_REFERRER,
        hintTokens: 0,
        fromUserId: referredUid,
        referralCode: referralCode.toUpperCase(),
        claimed: false,
        createdAt: now,
      });

      tx.set(referredRewardRef, {
        type: 'referral',
        lane: 'referred',
        gems: REFERRAL_REWARD_GEMS_REFERRED,
        coins: REFERRAL_REWARD_COINS_REFERRED,
        hintTokens: REFERRAL_REWARD_HINTS_REFERRED,
        fromUserId: referrerUid,
        referralCode: referralCode.toUpperCase(),
        claimed: false,
        createdAt: now,
      });

      return { alreadyGranted: false as const };
    });

    if (result.alreadyGranted) {
      return {
        success: true,
        alreadyGranted: true,
        referrerUid,
        grantedGemsReferrer: 0,
        grantedGemsReferred: 0,
      };
    }

    // Best-effort push to the referrer. Failures here don't roll back the
    // grant — the reward doc is authoritative and will appear in the inbox.
    try {
      await sendPushToUser(
        referrerUid,
        '\u{1F381} Your referral paid off!',
        'A friend just joined Wordfall. Claim your reward in the Invite screen.',
        { type: 'referral_success' },
      );
    } catch (err) {
      functions.logger.warn('[onReferralSuccess] push failed', { referrerUid, err });
    }

    return {
      success: true,
      alreadyGranted: false,
      referrerUid,
      grantedGemsReferrer: REFERRAL_REWARD_GEMS_REFERRER,
      grantedGemsReferred: REFERRAL_REWARD_GEMS_REFERRED,
    };
  },
);

// ─── 11. distributeWeeklyRewards ─────────────────────────────────────────────
//
// Runs every Sunday at 23:00 UTC to snapshot the closing week's global
// leaderboard and grant tiered rewards to the top finishers. Writes a
// per-user reward doc at `users/{uid}/rewards/{weekId}_leaderboard` —
// the client claims it from the reward inbox on next app open.
//
// Tier shape (intentionally steep; top-1 is a genuine dopamine hit):
//   rank 1       → 1000 gems + weekly_champion_trophy decoration
//   ranks 2-10   → 500 gems  + weekly_top10 frame
//   ranks 11-100 → 100 gems
//   ranks 101-1000 → 20 gems + weekly_participant badge
//
// Idempotency: reward docs use a stable id (`{weekId}_leaderboard`) so
// a re-run of the same schedule (manual trigger / retry) does NOT
// double-grant — the existing doc is simply overwritten.

const WEEKLY_REWARD_COLLECTION = 'weeklyScores';
const WEEKLY_REWARD_BATCH_SIZE = 500;

interface WeeklyRewardTier {
  maxRank: number;
  gems: number;
  decorations: string[];
  label: string;
}

const WEEKLY_REWARD_TIERS: WeeklyRewardTier[] = [
  { maxRank: 1, gems: 1000, decorations: ['weekly_champion_trophy'], label: 'Weekly Champion' },
  { maxRank: 10, gems: 500, decorations: ['frame_weekly_top10'], label: 'Weekly Top 10' },
  { maxRank: 100, gems: 100, decorations: [], label: 'Weekly Top 100' },
  { maxRank: 1000, gems: 20, decorations: ['badge_weekly_participant'], label: 'Weekly Top 1000' },
];

/**
 * Compute the weekId of the week that just closed when the function
 * runs at Sunday 23:00 UTC. Mirrors `getCurrentWeekId` in
 * `src/services/firestore.ts` so client and server agree on the ID.
 */
function getClosingWeekId(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  const weekNumber = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${year}_W${String(weekNumber).padStart(2, '0')}`;
}

function tierForRank(rank: number): WeeklyRewardTier | null {
  for (const tier of WEEKLY_REWARD_TIERS) {
    if (rank <= tier.maxRank) return tier;
  }
  return null;
}

export const distributeWeeklyRewards = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 23 * * 0') // Sunday 23:00 UTC
  .timeZone('UTC')
  .onRun(async () => {
    const weekId = getClosingWeekId();
    const startedAt = Date.now();

    // Pull the entire leaderboard for the closing week, ordered by
    // score. We pull up to the maximum rewarded rank (1000); ranks
    // below that receive no grant.
    const snap = await db
      .collection(WEEKLY_REWARD_COLLECTION)
      .where('weekId', '==', weekId)
      .orderBy('score', 'desc')
      .limit(WEEKLY_REWARD_TIERS[WEEKLY_REWARD_TIERS.length - 1].maxRank)
      .get();

    if (snap.empty) {
      functions.logger.info('[distributeWeeklyRewards] empty leaderboard', { weekId });
      return;
    }

    // Batch reward writes in groups of 500 to stay under Firestore's
    // per-commit limit. Each reward doc id is stable per-user-per-week
    // so re-running the schedule is idempotent (overwrite, not grow).
    let processed = 0;
    let batch = db.batch();
    for (let i = 0; i < snap.docs.length; i++) {
      const doc = snap.docs[i];
      const rank = i + 1;
      const tier = tierForRank(rank);
      if (!tier) continue;
      const userId = doc.data().userId as string | undefined;
      if (!userId) continue;

      const rewardRef = db.doc(`users/${userId}/rewards/${weekId}_leaderboard`);
      batch.set(rewardRef, {
        type: 'weekly_leaderboard',
        weekId,
        rank,
        tierLabel: tier.label,
        gems: tier.gems,
        decorations: tier.decorations,
        claimed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      processed++;

      if (processed % WEEKLY_REWARD_BATCH_SIZE === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }

    if (processed % WEEKLY_REWARD_BATCH_SIZE !== 0) {
      await batch.commit();
    }

    functions.logger.info('[distributeWeeklyRewards] granted rewards', {
      weekId,
      processed,
      durationMs: Date.now() - startedAt,
    });
  });
