/**
 * ToS + Privacy Policy acceptance ledger.
 *
 * Stores a locally-persisted flag so the gate only shows once.
 * When auth is available, a best-effort mirror is written to
 * `users/{uid}/consent/tos_v1` for audit purposes.
 *
 * Increment `TOS_VERSION` if the policy text materially changes — this forces
 * re-acceptance on next app open.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

export const TOS_VERSION = 'v1';
const STORAGE_KEY = '@wordfall_tos_accepted_v1';

interface AcceptanceRecord {
  version: string;
  acceptedAt: number;
}

export async function hasAcceptedTos(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw) as AcceptanceRecord;
    return rec.version === TOS_VERSION;
  } catch {
    return false;
  }
}

export async function recordTosAcceptance(): Promise<void> {
  const rec: AcceptanceRecord = {
    version: TOS_VERSION,
    acceptedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch (e) {
    logger.warn('[Consent] Failed to persist ToS acceptance locally', e);
  }

  // Best-effort server mirror. Never block onboarding on network errors.
  void mirrorAcceptanceToServer(rec).catch(() => {
    /* best-effort */
  });
}

async function mirrorAcceptanceToServer(rec: AcceptanceRecord): Promise<void> {
  try {
    const { getAuth } = await import('firebase/auth');
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const firestore = getFirestore();
    await setDoc(doc(firestore, `users/${uid}/consent/tos_${TOS_VERSION}`), {
      version: rec.version,
      acceptedAt: rec.acceptedAt,
    });
  } catch {
    // Firebase may not be configured — silent.
  }
}
