/**
 * Tier 6 B4 — Leaderboard submission service.
 *
 * Wraps the new `submitValidatedScore` Cloud Function so `firestoreService`
 * can route daily / weekly / event score writes through a server-side
 * validator instead of writing directly to Firestore. When the
 * `leaderboardValidationEnabled` Remote Config flag is off, callers fall
 * back to the legacy direct-write path in `firestoreService` — kept as a
 * kill-switch while the callable bakes.
 *
 * Error model mirrors `gifts.ts` / `referralRewards.ts`: any HttpsError
 * propagates unchanged so callers can log it. The caller (firestore.ts)
 * swallows errors the same way it does for direct writes, so a rejected
 * submission never blocks the puzzle-complete flow.
 */

import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import app from '../config/firebase';
import { crashReporter } from './crashReporting';
import { getRemoteBoolean } from './remoteConfig';

export type LeaderboardScope = 'daily' | 'weekly' | 'event';

export interface ValidatedScorePayload {
  scope: LeaderboardScope;
  score: number;
  stars?: number;
  level?: number;
  displayName?: string;
  eventId?: string; // required when scope='event'
  wordCount?: number;
  durationMs?: number;
  mode?: string;
}

export interface ValidatedScoreResult {
  ok: true;
  scope: LeaderboardScope;
  written: boolean;
}

let callable: HttpsCallable<ValidatedScorePayload, ValidatedScoreResult> | null = null;

function getCallable(): HttpsCallable<ValidatedScorePayload, ValidatedScoreResult> {
  if (!callable) {
    callable = httpsCallable<ValidatedScorePayload, ValidatedScoreResult>(
      getFunctions(app),
      'submitValidatedScore',
    );
  }
  return callable;
}

/**
 * Returns true when the RC flag is on AND the app is wired up for callables.
 * Callers should use this to gate the callable path vs the legacy direct-write
 * fallback.
 */
export function leaderboardValidationEnabled(): boolean {
  return getRemoteBoolean('leaderboardValidationEnabled');
}

export async function submitValidatedScore(
  payload: ValidatedScorePayload,
): Promise<ValidatedScoreResult> {
  try {
    const res = await getCallable()(payload);
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.('leaderboardSubmit: submitValidatedScore failed', 'leaderboard');
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'leaderboard_submit', scope: payload.scope },
    });
    throw e;
  }
}
