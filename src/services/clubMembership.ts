/**
 * Club membership client — thin wrapper around the joinClub/leaveClub
 * Cloud Function callables.
 *
 * firestore.rules deliberately reserve clubs/{clubId}.memberIds and
 * memberCount for the Admin SDK (a client update touching them is rejected),
 * so joining and leaving MUST route through these callables. Both are
 * idempotent server-side: retrying a flaky call cannot double-join or
 * double-leave.
 *
 * Failure modes (HttpsError codes):
 *  - 'unauthenticated'      — sign-in missing
 *  - 'not-found' (join)     — club id does not exist
 *  - 'failed-precondition'  — already a member of a different club
 *  - 'resource-exhausted'   — club full, or 10/hr membership-change cap hit
 *  - 'invalid-argument'     — bad club id
 */

import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import app from '../config/firebase';
import { crashReporter } from './crashReporting';

export interface JoinClubResult {
  success: true;
  clubId: string;
  memberCount: number;
  alreadyMember: boolean;
}

export interface LeaveClubResult {
  success: true;
  clubId: string;
  alreadyLeft: boolean;
  clubDeleted: boolean;
  memberCount?: number;
  newOwnerId?: string;
}

let joinClubCallable: HttpsCallable<{ clubId: string }, JoinClubResult> | null =
  null;
let leaveClubCallable: HttpsCallable<{ clubId: string }, LeaveClubResult> | null =
  null;

function getJoinClub(): HttpsCallable<{ clubId: string }, JoinClubResult> {
  if (!joinClubCallable) {
    joinClubCallable = httpsCallable<{ clubId: string }, JoinClubResult>(
      getFunctions(app),
      'joinClub',
    );
  }
  return joinClubCallable;
}

function getLeaveClub(): HttpsCallable<{ clubId: string }, LeaveClubResult> {
  if (!leaveClubCallable) {
    leaveClubCallable = httpsCallable<{ clubId: string }, LeaveClubResult>(
      getFunctions(app),
      'leaveClub',
    );
  }
  return leaveClubCallable;
}

export async function joinClubSecure(clubId: string): Promise<JoinClubResult> {
  try {
    const res = await getJoinClub()({ clubId });
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.('clubs: joinClubSecure failed', 'clubs');
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'club_join' },
    });
    throw e;
  }
}

export async function leaveClubSecure(clubId: string): Promise<LeaveClubResult> {
  try {
    const res = await getLeaveClub()({ clubId });
    return res.data;
  } catch (e) {
    crashReporter.addBreadcrumb?.('clubs: leaveClubSecure failed', 'clubs');
    crashReporter.captureException?.(e as Error, {
      tags: { feature: 'club_leave' },
    });
    throw e;
  }
}
