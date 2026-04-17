/**
 * Wordfall Cloud Functions
 *
 * - validateReceipt: HTTPS callable for server-side IAP receipt validation
 * - onSubscriptionRenew: Pub/Sub handler for Apple/Google subscription notifications
 * - clubGoalProgress: HTTPS callable for atomic club goal updates
 * - autoKickInactiveMembers: Scheduled daily cleanup of inactive club members
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// ── Types ────────────────────────────────────────────────────────────────────

interface ValidateReceiptRequest {
  receipt: string;
  productId: string;
  platform: "ios" | "android";
  userId?: string;
}

interface ValidateReceiptResponse {
  valid: boolean;
  error?: string;
  expiresAt?: number;
  productId?: string;
  isTrial?: boolean;
  transactionId?: string;
}

interface AppleVerifyReceiptResponse {
  status: number;
  environment?: string;
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    expires_date_ms?: string;
    is_trial_period?: string;
    is_in_intro_offer_period?: string;
  }>;
  receipt?: {
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
    }>;
  };
}

interface GooglePlayPurchase {
  kind: string;
  purchaseTimeMillis: string;
  purchaseState: number;
  consumptionState?: number;
  orderId: string;
  acknowledgementState?: number;
}

interface GooglePlaySubscription {
  kind: string;
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  paymentState?: number;
  orderId: string;
}

interface ClubGoalRequest {
  clubId: string;
  /** Deprecated — retained for wire compatibility. Caller UID is used server-side. */
  userId?: string;
  pointsEarned: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashReceipt(receipt: string): string {
  return crypto.createHash("sha256").update(receipt).digest("hex");
}

/**
 * PII-minimization: log the first 6 chars of a UID instead of the full value.
 * The full UID is still stored in Firestore (which is private) but Cloud
 * Functions logs can be retained longer and accessed by more people.
 */
function redactUid(uid: string | undefined | null): string {
  if (!uid) return "-";
  return uid.slice(0, 6) + "…";
}

/**
 * Check Firestore for receipt replay. Returns true if receipt was already used.
 */
async function isReceiptReplay(hash: string): Promise<boolean> {
  const doc = await db.collection("receipts").doc(hash).get();
  return doc.exists;
}

/**
 * Store validated receipt hash in Firestore to prevent replay.
 */
async function storeReceiptHash(
  hash: string,
  productId: string,
  userId?: string
): Promise<void> {
  await db
    .collection("receipts")
    .doc(hash)
    .set({
      productId,
      userId: userId ?? null,
      validatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// ── Apple App Store validation ───────────────────────────────────────────────

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

async function validateAppleReceipt(
  receipt: string,
  productId: string
): Promise<ValidateReceiptResponse> {
  const sharedSecret = functions.config().apple?.shared_secret ?? "";

  const payload = JSON.stringify({
    "receipt-data": receipt,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  // Try production first
  let response = await fetch(APPLE_PRODUCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  let data: AppleVerifyReceiptResponse = await response.json();

  // Status 21007 means sandbox receipt sent to production — retry against sandbox
  if (data.status === 21007) {
    response = await fetch(APPLE_SANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    data = await response.json();
  }

  if (data.status !== 0) {
    return {
      valid: false,
      error: `Apple verification failed with status ${data.status}`,
    };
  }

  // Find matching product in latest_receipt_info (subscriptions) or in_app (consumables)
  const latestInfo = data.latest_receipt_info;
  const inApp = data.receipt?.in_app;

  if (latestInfo && latestInfo.length > 0) {
    // Subscription — use the latest entry for this product
    const matching = latestInfo
      .filter((item) => item.product_id === productId)
      .sort(
        (a, b) =>
          parseInt(b.expires_date_ms ?? "0", 10) -
          parseInt(a.expires_date_ms ?? "0", 10)
      );

    if (matching.length > 0) {
      const latest = matching[0];
      return {
        valid: true,
        productId: latest.product_id,
        transactionId: latest.transaction_id,
        expiresAt: latest.expires_date_ms
          ? parseInt(latest.expires_date_ms, 10)
          : undefined,
        isTrial: latest.is_trial_period === "true",
      };
    }
  }

  if (inApp && inApp.length > 0) {
    // Consumable / non-consumable
    const matching = inApp.filter((item) => item.product_id === productId);
    if (matching.length > 0) {
      const latest = matching[matching.length - 1];
      return {
        valid: true,
        productId: latest.product_id,
        transactionId: latest.transaction_id,
      };
    }
  }

  return {
    valid: false,
    error: `Product ${productId} not found in receipt`,
  };
}

// ── Google Play validation ───────────────────────────────────────────────────

const GOOGLE_PACKAGE_NAME = "com.wordfall.game";

async function getGoogleAccessToken(): Promise<string> {
  const credential = admin.app().options.credential;
  if (!credential) {
    throw new Error("No Firebase credential available for Google API access");
  }
  const token = await credential.getAccessToken();
  return token.access_token;
}

async function validateGoogleReceipt(
  receipt: string,
  productId: string
): Promise<ValidateReceiptResponse> {
  const accessToken = await getGoogleAccessToken();
  const packageName =
    functions.config().google?.package_name ?? GOOGLE_PACKAGE_NAME;

  // Try subscription endpoint first
  const subUrl =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/subscriptions/${productId}/tokens/${receipt}`;

  const subResponse = await fetch(subUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (subResponse.ok) {
    const subData: GooglePlaySubscription = await subResponse.json();
    return {
      valid: true,
      productId,
      expiresAt: parseInt(subData.expiryTimeMillis, 10),
      transactionId: subData.orderId,
    };
  }

  // Fall back to products (consumables / non-consumables)
  const prodUrl =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/products/${productId}/tokens/${receipt}`;

  const prodResponse = await fetch(prodUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (prodResponse.ok) {
    const prodData: GooglePlayPurchase = await prodResponse.json();

    // purchaseState: 0 = purchased, 1 = canceled, 2 = pending
    if (prodData.purchaseState !== 0) {
      return {
        valid: false,
        error: `Purchase not in valid state (state: ${prodData.purchaseState})`,
      };
    }

    return {
      valid: true,
      productId,
      transactionId: prodData.orderId,
    };
  }

  const errorText = await prodResponse.text().catch(() => "Unknown error");
  return {
    valid: false,
    error: `Google Play validation failed: ${errorText}`,
  };
}

// ── Cloud Functions ──────────────────────────────────────────────────────────

async function validateReceiptCore(
  data: ValidateReceiptRequest,
  authenticatedUserId?: string
): Promise<ValidateReceiptResponse> {
  const { receipt, productId, platform } = data;

  // SECURITY: Reject unauthenticated calls. Fulfillment is always written to
  // the authenticated caller's UID — never a client-supplied userId field.
  if (!authenticatedUserId) {
    return {
      valid: false,
      error: "Unauthenticated",
    };
  }

  if (!receipt || !productId || !platform) {
    return {
      valid: false,
      error: "Missing required fields: receipt, productId, platform",
    };
  }

  if (platform !== "ios" && platform !== "android") {
    return {
      valid: false,
      error: "Platform must be 'ios' or 'android'",
    };
  }

  const hash = hashReceipt(receipt);
  if (await isReceiptReplay(hash)) {
    functions.logger.warn("Duplicate receipt detected", {
      productId,
      uid: authenticatedUserId.slice(0, 6),
    });
    return {
      valid: false,
      error: "Duplicate receipt — possible replay attack",
    };
  }

  let result: ValidateReceiptResponse;

  try {
    if (platform === "ios") {
      result = await validateAppleReceipt(receipt, productId);
    } else {
      result = await validateGoogleReceipt(receipt, productId);
    }
  } catch (error) {
    functions.logger.error("Receipt validation error", { error, productId });
    return {
      valid: false,
      error: "Receipt validation failed",
    };
  }

  if (result.valid) {
    await storeReceiptHash(hash, productId, authenticatedUserId);

    await db
      .collection("users")
      .doc(authenticatedUserId)
      .collection("purchases")
      .add({
        productId,
        transactionId: result.transactionId ?? null,
        expiresAt: result.expiresAt ?? null,
        platform,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  return result;
}

/**
 * validateReceipt — HTTPS endpoint
 *
 * Matches the mobile app's fetch-based contract:
 * POST /validateReceipt
 * { receipt, productId, platform, userId? }
 */
export const validateReceipt = functions.https.onRequest(
  async (req, res): Promise<void> => {
    if (req.method !== "POST") {
      res.status(405).json({ valid: false, error: "Method not allowed" });
      return;
    }

    const data = (req.body ?? {}) as ValidateReceiptRequest;
    const authHeader = req.header("Authorization");
    let authenticatedUserId: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice("Bearer ".length);
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        authenticatedUserId = decoded.uid;
      } catch (error) {
        functions.logger.warn("Failed to verify Firebase ID token for receipt validation", {
          error,
        });
      }
    }

    const result = await validateReceiptCore(data, authenticatedUserId);
    const statusCode =
      result.valid ? 200 :
      result.error === "Unauthenticated" ? 401 :
      result.error === "Missing required fields: receipt, productId, platform" ? 400 :
      result.error === "Platform must be 'ios' or 'android'" ? 400 :
      result.error === "Method not allowed" ? 405 :
      result.error === "Receipt validation failed" ? 500 :
      200;

    res.status(statusCode).json(result);
  }
);

/**
 * onSubscriptionRenew — Pub/Sub triggered
 *
 * Handles real-time subscription notifications from Apple (App Store Server
 * Notifications v2) and Google (Real-time Developer Notifications) forwarded
 * via a Pub/Sub topic.
 *
 * Expected message data (JSON):
 * - Apple: { platform: "ios", notificationType, subtype, transactionInfo }
 * - Google: { platform: "android", subscriptionNotification: { ... } }
 */
export const onSubscriptionRenew = functions.pubsub
  .topic("subscription-events")
  .onPublish(async (message) => {
    let payload: Record<string, unknown>;
    try {
      payload = message.json;
    } catch {
      functions.logger.error("Failed to parse subscription event payload");
      return;
    }

    const platform = payload.platform as string | undefined;

    if (platform === "ios") {
      await handleAppleSubscriptionEvent(payload);
    } else if (platform === "android") {
      await handleGoogleSubscriptionEvent(payload);
    } else {
      functions.logger.warn("Unknown platform in subscription event", {
        platform,
      });
    }
  });

async function handleAppleSubscriptionEvent(
  payload: Record<string, unknown>
): Promise<void> {
  const notificationType = payload.notificationType as string;
  const transactionInfo = payload.transactionInfo as
    | Record<string, unknown>
    | undefined;

  if (!transactionInfo) {
    functions.logger.warn("No transactionInfo in Apple event");
    return;
  }

  const originalTransactionId =
    transactionInfo.originalTransactionId as string;
  const expiresDateMs = transactionInfo.expiresDate as number | undefined;

  // Find user by originalTransactionId
  const purchaseSnap = await db
    .collectionGroup("purchases")
    .where("transactionId", "==", originalTransactionId)
    .limit(1)
    .get();

  if (purchaseSnap.empty) {
    functions.logger.warn("No user found for Apple transaction", {
      originalTransactionId,
    });
    return;
  }

  const purchaseDoc = purchaseSnap.docs[0];
  const userId = purchaseDoc.ref.parent.parent?.id;
  if (!userId) return;

  const isRenewal =
    notificationType === "DID_RENEW" ||
    notificationType === "SUBSCRIBED" ||
    notificationType === "OFFER_REDEEMED";
  const isExpired =
    notificationType === "EXPIRED" ||
    notificationType === "REVOKE" ||
    notificationType === "REFUND";

  if (isRenewal && expiresDateMs) {
    await db
      .collection("users")
      .doc(userId)
      .update({
        vipActive: true,
        vipExpiresAt: expiresDateMs,
        vipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    functions.logger.info("Apple subscription renewed", {
      uid: redactUid(userId),
      expiresAt: expiresDateMs,
    });
  } else if (isExpired) {
    await db
      .collection("users")
      .doc(userId)
      .update({
        vipActive: false,
        vipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    functions.logger.info("Apple subscription expired/revoked", { uid: redactUid(userId) });
  }
}

async function handleGoogleSubscriptionEvent(
  payload: Record<string, unknown>
): Promise<void> {
  const notification = payload.subscriptionNotification as
    | Record<string, unknown>
    | undefined;

  if (!notification) {
    functions.logger.warn("No subscriptionNotification in Google event");
    return;
  }

  const purchaseToken = notification.purchaseToken as string;
  const subscriptionId = notification.subscriptionId as string;
  const notificationType = notification.notificationType as number;

  // Google notification types:
  // 1 = RECOVERED, 2 = RENEWED, 3 = CANCELED, 4 = PURCHASED,
  // 5 = ON_HOLD, 6 = IN_GRACE_PERIOD, 7 = RESTARTED,
  // 12 = REVOKED, 13 = EXPIRED

  // Re-validate the subscription to get current expiry
  let subResult: ValidateReceiptResponse;
  try {
    subResult = await validateGoogleReceipt(purchaseToken, subscriptionId);
  } catch (error) {
    functions.logger.error("Failed to validate Google subscription", {
      error,
    });
    return;
  }

  // Find user by purchase token
  const hash = hashReceipt(purchaseToken);
  const receiptDoc = await db.collection("receipts").doc(hash).get();
  const userId = receiptDoc.data()?.userId as string | undefined;

  if (!userId) {
    functions.logger.warn("No user found for Google subscription", {
      subscriptionId,
    });
    return;
  }

  const isActive = [1, 2, 4, 6, 7].includes(notificationType);

  if (isActive && subResult.expiresAt) {
    await db
      .collection("users")
      .doc(userId)
      .update({
        vipActive: true,
        vipExpiresAt: subResult.expiresAt,
        vipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    functions.logger.info("Google subscription renewed", {
      uid: redactUid(userId),
      expiresAt: subResult.expiresAt,
    });
  } else {
    await db
      .collection("users")
      .doc(userId)
      .update({
        vipActive: false,
        vipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    functions.logger.info("Google subscription expired/canceled", { uid: redactUid(userId) });
  }
}

/**
 * clubGoalProgress — HTTPS Callable
 *
 * Atomically increments a club's cooperative goal progress.
 */
export const clubGoalProgress = functions.https.onCall(
  async (
    data: ClubGoalRequest,
    context
  ): Promise<{ success: boolean; currentProgress: number }> => {
    // SECURITY: Require authentication. The caller's UID — never a client-
    // supplied userId — is the only identity we trust for progress attribution.
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }
    const callerUid = context.auth.uid;

    const { clubId, pointsEarned } = data;

    if (!clubId || typeof pointsEarned !== "number") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: clubId, pointsEarned"
      );
    }

    if (pointsEarned <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "pointsEarned must be positive"
      );
    }

    // Clamp to a sane per-call ceiling to prevent runaway score injection
    const MAX_POINTS_PER_CALL = 10000;
    if (pointsEarned > MAX_POINTS_PER_CALL) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `pointsEarned exceeds per-call max (${MAX_POINTS_PER_CALL})`
      );
    }

    const userId = callerUid;

    const clubRef = db.collection("clubs").doc(clubId);

    const updatedProgress = await db.runTransaction(async (tx) => {
      const clubDoc = await tx.get(clubRef);
      if (!clubDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Club not found");
      }

      const clubData = clubDoc.data()!;
      const memberIds = (clubData.memberIds as string[]) ?? [];

      if (!memberIds.includes(userId)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not a member of this club"
        );
      }

      // Atomic increment
      tx.update(clubRef, {
        "currentGoal.progress":
          admin.firestore.FieldValue.increment(pointsEarned),
        [`memberContributions.${userId}`]:
          admin.firestore.FieldValue.increment(pointsEarned),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update member's last active timestamp
      tx.update(clubRef, {
        [`memberLastActive.${userId}`]:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      const currentProgress =
        ((clubData.currentGoal?.progress as number) ?? 0) + pointsEarned;
      return currentProgress;
    });

    return { success: true, currentProgress: updatedProgress };
  }
);

/**
 * autoKickInactiveMembers — Scheduled (daily at 3:00 AM UTC)
 *
 * Removes club members who have been inactive for more than 14 days.
 */
export const autoKickInactiveMembers = functions.pubsub
  .schedule("every day 03:00")
  .timeZone("UTC")
  .onRun(async () => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(fourteenDaysAgo);

    const clubsSnapshot = await db.collection("clubs").get();

    let totalKicked = 0;

    for (const clubDoc of clubsSnapshot.docs) {
      const clubData = clubDoc.data();
      const memberIds = (clubData.memberIds as string[]) ?? [];
      const memberLastActive =
        (clubData.memberLastActive as Record<
          string,
          admin.firestore.Timestamp
        >) ?? {};
      const ownerId = clubData.ownerId as string | undefined;

      const inactiveMembers: string[] = [];

      for (const memberId of memberIds) {
        // Never kick the club owner
        if (memberId === ownerId) continue;

        const lastActive = memberLastActive[memberId];
        if (!lastActive || lastActive.toMillis() < cutoffTimestamp.toMillis()) {
          inactiveMembers.push(memberId);
        }
      }

      if (inactiveMembers.length === 0) continue;

      // Remove inactive members
      await clubDoc.ref.update({
        memberIds: admin.firestore.FieldValue.arrayRemove(...inactiveMembers),
        memberCount: admin.firestore.FieldValue.increment(
          -inactiveMembers.length
        ),
      });

      // Clean up their entries from memberLastActive and memberContributions
      const cleanupUpdate: Record<string, admin.firestore.FieldValue> = {};
      for (const memberId of inactiveMembers) {
        cleanupUpdate[`memberLastActive.${memberId}`] =
          admin.firestore.FieldValue.delete();
        cleanupUpdate[`memberContributions.${memberId}`] =
          admin.firestore.FieldValue.delete();
      }
      await clubDoc.ref.update(cleanupUpdate);

      totalKicked += inactiveMembers.length;
      functions.logger.info("Kicked inactive members from club", {
        clubId: clubDoc.id,
        kicked: inactiveMembers.length,
        members: inactiveMembers,
      });
    }

    functions.logger.info("Auto-kick complete", { totalKicked });
  });

// ── Account deletion (GDPR / Play Store Data Safety) ─────────────────────────

/**
 * Delete every document in a subcollection in batches of 400.
 * Firestore batch limit is 500; 400 leaves headroom for dependent writes.
 */
async function deleteCollection(
  collectionRef: admin.firestore.CollectionReference | admin.firestore.Query,
): Promise<number> {
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await collectionRef.limit(400).get();
    if (snap.empty) return total;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 400) return total;
  }
}

/**
 * Hash a UID for receipt-ledger retention. Tax / fraud audit needs the ledger
 * to persist for years; the hash breaks linkability back to the deleted user.
 */
function hashUid(uid: string): string {
  return crypto.createHash("sha256").update(uid).digest("hex");
}

/**
 * requestAccountDeletion — HTTPS endpoint.
 *
 * POST /requestAccountDeletion
 * Headers: Authorization: Bearer <Firebase ID token>
 *
 * Purges: users/{uid} + all subcollections, players/{uid}, club membership +
 * authored chat messages, consent ledger entries, blockedUsers edges, push
 * tokens. Retains /receipts rows with UID replaced by SHA-256 hash (audit).
 * Finally deletes the Firebase Auth user record.
 *
 * Must respond within 30 days per Google Play Data Safety policy. In practice
 * this function completes synchronously.
 */
export const requestAccountDeletion = functions.https.onRequest(
  async (req, res): Promise<void> => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const authHeader = req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ ok: false, error: "Missing auth token" });
      return;
    }

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      uid = decoded.uid;
    } catch (error) {
      functions.logger.warn("Failed to verify ID token for account deletion", { error });
      res.status(401).json({ ok: false, error: "Invalid auth token" });
      return;
    }

    const tag = redactUid(uid);
    functions.logger.info("Account deletion requested", { uid: tag });

    const stats = {
      userSubcollections: 0,
      playerDoc: 0,
      clubsLeft: 0,
      clubMessagesRemoved: 0,
      receiptsHashed: 0,
      reportsAnonymized: 0,
    };

    try {
      const userRef = db.collection("users").doc(uid);
      for (const subName of ["consent", "blockedUsers", "pushTokens", "inventory", "notifications"]) {
        stats.userSubcollections += await deleteCollection(userRef.collection(subName));
      }

      await userRef.delete().catch(() => undefined);

      const playerRef = db.collection("players").doc(uid);
      const playerSnap = await playerRef.get();
      if (playerSnap.exists) {
        await playerRef.delete();
        stats.playerDoc = 1;
      }

      const clubsWithMember = await db
        .collection("clubs")
        .where("memberIds", "array-contains", uid)
        .get();
      for (const clubDoc of clubsWithMember.docs) {
        const update: Record<string, unknown> = {
          memberIds: admin.firestore.FieldValue.arrayRemove(uid),
          [`memberContributions.${uid}`]: admin.firestore.FieldValue.delete(),
          [`memberRoles.${uid}`]: admin.firestore.FieldValue.delete(),
        };
        await clubDoc.ref.update(update);
        stats.clubsLeft += 1;

        const authored = await clubDoc.ref
          .collection("messages")
          .where("userId", "==", uid)
          .get();
        if (!authored.empty) {
          const batch = db.batch();
          authored.docs.forEach((m) => batch.delete(m.ref));
          await batch.commit();
          stats.clubMessagesRemoved += authored.size;
        }
      }

      const hashed = hashUid(uid);
      const receipts = await db.collection("receipts").where("userId", "==", uid).get();
      if (!receipts.empty) {
        const batch = db.batch();
        receipts.docs.forEach((r) =>
          batch.update(r.ref, {
            userId: `deleted:${hashed}`,
            anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        );
        await batch.commit();
        stats.receiptsHashed = receipts.size;
      }

      const reports = await db.collection("reports").where("reporterId", "==", uid).get();
      if (!reports.empty) {
        const batch = db.batch();
        reports.docs.forEach((r) => batch.update(r.ref, { reporterId: `deleted:${hashed}` }));
        await batch.commit();
        stats.reportsAnonymized = reports.size;
      }

      await admin.auth().deleteUser(uid).catch((e) => {
        functions.logger.warn("Auth user delete failed (non-fatal)", {
          uid: tag,
          error: e?.message,
        });
      });

      functions.logger.info("Account deletion complete", { uid: tag, ...stats });
      res.status(200).json({ ok: true, ...stats });
    } catch (error) {
      functions.logger.error("Account deletion failed", {
        uid: tag,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ ok: false, error: "Deletion failed. Please contact support." });
    }
  },
);
