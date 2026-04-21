/**
 * Gifting client — thin wrapper around the secure sendGift/claimGift
 * Cloud Function callables.
 *
 * The direct-Firestore sendGift on firestoreService still works (and is
 * still what PlayerSocialContext calls today), but it is spammable and has
 * no rate limit. This module is the secured path: atomic server-side
 * transaction with 5/day sender cap and idempotency-key replay protection.
 *
 * Usage:
 *   await sendGiftSecure({ toUserId, type: 'life' });
 *   // UI: render getPendingGifts() from firestoreService, then on tap:
 *   await claimGiftSecure(giftId);
 *   // then locally: economy.addLives(1) / addHintTokens(1)
 *
 * Failure modes (HttpsError codes):
 *  - 'unauthenticated'      — sign-in missing
 *  - 'permission-denied'    — recipient is not clubmate/friend
 *  - 'resource-exhausted'   — 5/day cap hit
 *  - 'invalid-argument'     — bad input
 *  - 'not-found' (claim)    — gift id does not exist
 */

import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import app from '../config/firebase';
import { crashReporter } from './crashReporting';
import { generateIdempotencyKey } from '../utils/idempotency';

export type GiftType = 'hint' | 'tile' | 'life';

export interface SendGiftInput {
  toUserId: string;
  type: GiftType;
  amount?: number;
  fromDisplayName?: string;
  /** Optional — auto-generated if omitted. Dedupes replays. */
  idempotencyKey?: string;
}

export interface SendGiftResult {
  success: true;
  giftId: string;
  alreadySent: boolean;
  claimed: boolean;
}

export interface ClaimGiftResult {
  success: true;
  type: GiftType;
  amount: number;
  alreadyClaimed: boolean;
}

let sendGiftCallable: HttpsCallable<SendGiftInput, SendGiftResult> | null = null;
let claimGiftCallable: HttpsCallable<{ giftId: string }, ClaimGiftResult> | null =
  null;

function getSendGift(): HttpsCallable<SendGiftInput, SendGiftResult> {
  if (!sendGiftCallable) {
    sendGiftCallable = httpsCallable<SendGiftInput, SendGiftResult>(
      getFunctions(app),
      'sendGift',
    );
  }
  return sendGiftCallable;
}

function getClaimGift(): HttpsCallable<{ giftId: string }, ClaimGiftResult> {
  if (!claimGiftCallable) {
    claimGiftCallable = httpsCallable<{ giftId: string }, ClaimGiftResult>(
      getFunctions(app),
      'claimGift',
    );
  }
  return claimGiftCallable;
}

export async function sendGiftSecure(
  input: SendGiftInput,
): Promise<SendGiftResult> {
  const payload: SendGiftInput = {
    ...input,
    amount: input.amount ?? 1,
    idempotencyKey: input.idempotencyKey ?? generateIdempotencyKey(),
  };
  try {
    const res = await getSendGift()(payload);
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.('gifts: sendGiftSecure failed', 'gifts');
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'gifts_send' },
    });
    throw e;
  }
}

export async function claimGiftSecure(giftId: string): Promise<ClaimGiftResult> {
  try {
    const res = await getClaimGift()({ giftId });
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.('gifts: claimGiftSecure failed', 'gifts');
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'gifts_claim' },
    });
    throw e;
  }
}
