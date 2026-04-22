/**
 * Shim for src/services/firestore — used by the visual harness only.
 * Returns deterministic data from MockProviders overrides where available,
 * otherwise empty arrays / no-ops.
 */
import { readOverride } from '../mocks';

export const firestoreService = {
  isAvailable(): boolean {
    return true;
  },
  async getEventLeaderboard(
    _eventId: string,
    _limit?: number,
  ): Promise<Array<{ userId: string; displayName: string; score: number }>> {
    return readOverride('mockEventLeaderboard') ?? [];
  },
  async submitEventScore(): Promise<void> {
    /* no-op in harness */
  },
  async listPublicClubs(): Promise<unknown[]> {
    return [];
  },
  async getClubMessages(): Promise<unknown[]> {
    return [];
  },
  async getBlockedUserIds(): Promise<Set<string>> {
    return new Set();
  },
};

export type ClubMessage = unknown;
