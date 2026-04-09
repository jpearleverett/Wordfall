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

import * as functions from 'firebase-functions';
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
export const sendPushNotification = functions.https.onCall(
  async (data: { userId: string; title: string; body: string; data?: Record<string, string> }) => {
    const { userId, title, body } = data;

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

// ─── 6. validateReceipt ──────────────────────────────────────────────────────

/**
 * HTTPS callable function to validate IAP receipts server-side.
 * Accepts receipt data from the client and validates against Apple/Google APIs.
 * Returns validation result including subscription expiry for recurring products.
 */
export const validateReceipt = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to validate receipts.');
  }

  const { receipt, productId, platform } = data;

  if (!receipt || !productId || !platform) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing receipt, productId, or platform.');
  }

  const userId = context.auth.uid;

  try {
    let validationResult: { valid: boolean; expiresAt?: number };

    if (platform === 'ios') {
      validationResult = await validateAppleReceipt(receipt, productId);
    } else if (platform === 'android') {
      validationResult = await validateGoogleReceipt(receipt, productId);
    } else {
      throw new functions.https.HttpsError('invalid-argument', `Unsupported platform: ${platform}`);
    }

    // Log validated purchase to Firestore for analytics
    if (validationResult.valid) {
      await db.collection('validatedPurchases').add({
        userId,
        productId,
        platform,
        validatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: validationResult.expiresAt ?? null,
      });
    }

    return validationResult;
  } catch (error: any) {
    console.error(`Receipt validation failed for user ${userId}:`, error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Receipt validation failed. Please try again.');
  }
});

/**
 * Validate an Apple App Store receipt.
 * Tries production endpoint first, falls back to sandbox.
 */
async function validateAppleReceipt(
  receiptData: string,
  productId: string
): Promise<{ valid: boolean; expiresAt?: number }> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET || '';

  const payload = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  // Try production first
  const prodUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

  let response = await fetch(prodUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let result = await response.json();

  // Status 21007 means receipt is from sandbox — retry against sandbox
  if (result.status === 21007) {
    response = await fetch(sandboxUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    result = await response.json();
  }

  if (result.status !== 0) {
    console.warn(`Apple receipt validation failed with status: ${result.status}`);
    return { valid: false };
  }

  // Check that the product ID matches an in_app or latest_receipt_info entry
  const inApp = result.receipt?.in_app || [];
  const latestInfo = result.latest_receipt_info || [];
  const allTransactions = [...inApp, ...latestInfo];

  const matchingTransaction = allTransactions.find(
    (t: any) => t.product_id === productId
  );

  if (!matchingTransaction) {
    return { valid: false };
  }

  // For subscriptions, check expiry
  const expiresDateMs = matchingTransaction.expires_date_ms
    ? parseInt(matchingTransaction.expires_date_ms, 10)
    : undefined;

  if (expiresDateMs && expiresDateMs < Date.now()) {
    return { valid: false }; // Subscription expired
  }

  return { valid: true, expiresAt: expiresDateMs };
}

/**
 * Validate a Google Play receipt (purchase token).
 * Uses the Google Play Developer API via service account.
 */
async function validateGoogleReceipt(
  purchaseToken: string,
  productId: string
): Promise<{ valid: boolean; expiresAt?: number }> {
  // Google Play validation requires the googleapis package or a REST call
  // with service account credentials. For now, use the REST API directly.
  const packageName = 'com.wordfall.app';

  // Try as a product purchase first (one-time IAP)
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const authClient = await auth.getClient();

    const androidPublisher = google.androidpublisher({ version: 'v3', auth: authClient });

    // Try one-time product validation
    try {
      const productResult = await androidPublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });

      const purchaseState = productResult.data.purchaseState;
      // 0 = purchased, 1 = canceled, 2 = pending
      if (purchaseState === 0) {
        return { valid: true };
      }
      return { valid: false };
    } catch {
      // Not a product purchase — try subscription
    }

    // Try subscription validation
    try {
      const subResult = await androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const expiryTimeMillis = parseInt(subResult.data.expiryTimeMillis || '0', 10);
      const paymentState = subResult.data.paymentState;

      if (expiryTimeMillis > Date.now() && paymentState !== undefined) {
        return { valid: true, expiresAt: expiryTimeMillis };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  } catch (error) {
    // googleapis not available — accept receipt in dev, reject in prod
    console.error('Google Play validation requires googleapis package:', error);
    return { valid: false };
  }
}
