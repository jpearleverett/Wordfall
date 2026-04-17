/**
 * Account deletion service.
 *
 * Calls the server-side `requestAccountDeletion` HTTPS endpoint which:
 *  - Purges Firestore user data (players, users + subcollections, club memberships, authored messages)
 *  - Anonymizes purchase receipts + reports with a SHA-256-hashed UID (retained for tax / fraud audit)
 *  - Deletes the Firebase Auth record
 *
 * Play Store + GDPR both require this path to exist in-app. A parallel web form
 * (wordfallgame.app/account-deletion) covers users who already uninstalled.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { crashReporter } from './crashReporting';

const FIREBASE_FUNCTIONS_URL =
  (typeof process !== 'undefined' &&
    (process as any).env?.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL) ||
  '';

export function isAccountDeletionConfigured(): boolean {
  return !!FIREBASE_FUNCTIONS_URL;
}

export interface AccountDeletionStats {
  userSubcollections: number;
  playerDoc: number;
  clubsLeft: number;
  clubMessagesRemoved: number;
  receiptsHashed: number;
  reportsAnonymized: number;
}

export interface AccountDeletionResult {
  ok: boolean;
  error?: string;
  stats?: AccountDeletionStats;
}

/**
 * Request full account deletion. Requires an authenticated Firebase user.
 * Does NOT sign out or clear local storage — callers handle that after success.
 */
export async function requestAccountDeletion(): Promise<AccountDeletionResult> {
  if (!FIREBASE_FUNCTIONS_URL) {
    return {
      ok: false,
      error: 'Account deletion endpoint is not configured. Please contact support.',
    };
  }

  const user = auth.currentUser;
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete your account.' };
  }

  let idToken: string;
  try {
    idToken = await user.getIdToken(true);
  } catch (error) {
    crashReporter.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { operation: 'accountDeletion.getIdToken' } },
    );
    return { ok: false, error: 'Could not verify your account. Please try again.' };
  }

  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/requestAccountDeletion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.ok) {
      const error = data?.error ?? `Server returned ${response.status}`;
      return { ok: false, error };
    }

    return {
      ok: true,
      stats: {
        userSubcollections: data.userSubcollections ?? 0,
        playerDoc: data.playerDoc ?? 0,
        clubsLeft: data.clubsLeft ?? 0,
        clubMessagesRemoved: data.clubMessagesRemoved ?? 0,
        receiptsHashed: data.receiptsHashed ?? 0,
        reportsAnonymized: data.reportsAnonymized ?? 0,
      },
    };
  } catch (error) {
    crashReporter.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { operation: 'accountDeletion.fetch' } },
    );
    return {
      ok: false,
      error: 'Could not reach the deletion service. Check your connection and try again.',
    };
  }
}

/**
 * Clear every AsyncStorage key the app owns. Called after a successful
 * server-side deletion so re-opens start fresh.
 */
export async function clearLocalUserData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith('@wordfall'));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch (error) {
    crashReporter.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { operation: 'accountDeletion.clearLocal' } },
    );
  }
}
