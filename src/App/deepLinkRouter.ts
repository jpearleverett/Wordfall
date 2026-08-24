// ─── Deep Link Router (pure) ───────────────────────────────────────────────
// Resolution + pending-link buffering logic for deep links, extracted from
// useDeepLinks so it can be unit-tested without React or react-native.

import { DeepLinkData } from '../utils/deepLinking';
import { generateDailyBoard } from '../engine/boardGenerator';

/**
 * Link types whose handling is a navigate() into the main tab tree.
 * Referral is NOT here — applyReferralCode needs no navigation, so it can
 * (and should) run even while the consent gate or onboarding is up.
 */
export const NAV_LINK_TYPES: ReadonlySet<DeepLinkData['type']> = new Set([
  'challenge',
  'daily',
  'club_invite',
]);

export type DeepLinkResolution =
  | { kind: 'navigate'; target: string; params?: Record<string, unknown> }
  | { kind: 'invalid_club' }
  | { kind: 'ignore' };

export function isValidClubId(id: unknown): id is string {
  return (
    typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[A-Za-z0-9_-]+$/.test(id)
  );
}

/**
 * Resolve a parsed deep link into a navigation command. Call this only once
 * the navigation tree can actually handle it — the 'daily' case generates
 * the day's board at resolve time (same generator HomeScreen's startDaily
 * uses), so a link buffered across a UTC date boundary still opens TODAY's
 * puzzle rather than a stale one.
 */
export function resolveDeepLinkNav(
  data: DeepLinkData,
  now: Date = new Date(),
): DeepLinkResolution {
  switch (data.type) {
    case 'challenge':
      // There is no challenge-accept flow yet: the id used to be written to
      // a ref that nothing read, which LOOKED like handling and did nothing.
      // Until an accept flow exists, take the player somewhere sensible (the
      // Play tab, where the challenge's mode lives) instead of pretending.
      return { kind: 'navigate', target: 'Play' };
    case 'daily': {
      // GameScreenWrapper renders a dead-end "No puzzle loaded" screen (no
      // header, no tab bar) when params.board is absent — every legitimate
      // Game navigation generates a board first. Mirror startDaily
      // (App.tsx): same generator, same params, landing on the Home stack
      // with HomeMain kept beneath (`initial: false`) so back-navigation
      // matches launching the daily from the home screen.
      const today = now.toISOString().split('T')[0];
      const board = generateDailyBoard(today);
      return {
        kind: 'navigate',
        target: 'Home',
        params: {
          screen: 'Game',
          initial: false,
          params: { board, level: 0, mode: 'daily', isDaily: true },
        },
      };
    }
    case 'club_invite': {
      if (!isValidClubId(data.clubId)) {
        return { kind: 'invalid_club' };
      }
      // Club is registered in the PROFILE stack; ClubScreen reads
      // joinClubId from route params (confirm-before-join flow).
      // `initial: false` keeps ProfileMain beneath so back works.
      return {
        kind: 'navigate',
        target: 'Profile',
        params: {
          screen: 'Club',
          initial: false,
          params: { joinClubId: data.clubId },
        },
      };
    }
    default:
      return { kind: 'ignore' };
  }
}

export interface PendingLinkReplayer {
  /** Deliver now if ready, otherwise buffer (last link wins). */
  receive(url: string): 'delivered' | 'buffered';
  /** Attempt delivery of the buffered link; true if it was delivered. */
  flush(): boolean;
  /** The buffered link, if any (test/introspection). */
  peek(): string | null;
}

/**
 * Single-slot pending-link buffer. On a first-run cold start the initial
 * URL arrives while the NavigationContainer is behind the consent gate (or
 * the root stack holds only Onboarding), where navigate() is silently
 * dropped — this buffers the link so the caller can replay it once the
 * main tabs are mounted.
 */
export function createPendingLinkReplayer(opts: {
  isReady: () => boolean;
  deliver: (url: string) => void;
}): PendingLinkReplayer {
  let pending: string | null = null;
  return {
    receive(url: string) {
      if (opts.isReady()) {
        opts.deliver(url);
        return 'delivered';
      }
      pending = url;
      return 'buffered';
    },
    flush() {
      if (pending == null || !opts.isReady()) return false;
      const url = pending;
      pending = null;
      opts.deliver(url);
      return true;
    },
    peek: () => pending,
  };
}
