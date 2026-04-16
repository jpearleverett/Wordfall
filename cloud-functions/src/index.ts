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

    // Per-sender rate limit
    if (!checkPushRateLimit(senderUid)) {
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

