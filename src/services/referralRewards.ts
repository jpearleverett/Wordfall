/**
 * Referral rewards client — thin wrapper around the onReferralSuccess
 * Cloud Function callable. Fires once per referred user after they complete
 * their first puzzle. The server writes reward docs to BOTH users' reward
 * inboxes with { claimed: false } and the client flips them to claimed +
 * applies the economy grant locally (mirrors the gift inbox pattern).
 *
 * Failure modes (HttpsError codes):
 *  - 'unauthenticated'      — sign-in missing
 *  - 'not-found'            — referral code does not map to a real UID
 *  - 'permission-denied'    — self-referral attempt
 *  - 'resource-exhausted'   — referrer's daily grant cap hit
 *  - 'invalid-argument'     — bad / malformed code
 *  - 'already-exists'       — this referred user already credited this code
 */

import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import app from '../config/firebase';
import { crashReporter } from './crashReporting';

export interface ReferralSuccessInput {
  referralCode: string;
}

export interface ReferralSuccessResult {
  success: true;
  alreadyGranted: boolean;
  referrerUid: string;
  grantedGemsReferrer: number;
  grantedGemsReferred: number;
}

let callable: HttpsCallable<ReferralSuccessInput, ReferralSuccessResult> | null =
  null;

function getCallable(): HttpsCallable<ReferralSuccessInput, ReferralSuccessResult> {
  if (!callable) {
    callable = httpsCallable<ReferralSuccessInput, ReferralSuccessResult>(
      getFunctions(app),
      'onReferralSuccess',
    );
  }
  return callable;
}

export async function recordReferralSuccessSecure(
  referralCode: string,
): Promise<ReferralSuccessResult> {
  try {
    const res = await getCallable()({ referralCode });
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.(
      'referralRewards: recordReferralSuccessSecure failed',
      'referral',
    );
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'referral_grant' },
    });
    throw e;
  }
}
