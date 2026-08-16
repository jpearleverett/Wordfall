/**
 * Session-level pacing for in-game purchase offers.
 *
 * GameScreen already gates offers to one per level, but that was the ONLY
 * limit: no minimum player level, no session cap, and no cooldown. A player
 * on level 2 could be shown a purchase offer, then another on level 3, 4, 5
 * — one per level, forever. That is the pacing players describe as "the game
 * keeps asking me for money", and it costs both retention and store rating
 * while converting worse than a smaller number of well-timed prompts.
 *
 * Three limits, all Remote-Config tunable so pacing can be adjusted without
 * a client release:
 *
 *   1. A grace period — no purchase offers until the player has actually
 *      experienced the core loop.
 *   2. A per-session cap.
 *   3. A cooldown between offers.
 *
 * State is module-level and deliberately NOT persisted: it should reset when
 * the app restarts (that is what "per session" means), and GameScreen
 * remounts on every level change, so a ref inside the component would reset
 * far too often to enforce anything.
 */
import { getRemoteNumber } from '../services/remoteConfig';

interface OfferPacingState {
  shownThisSession: number;
  lastShownAt: number;
}

const state: OfferPacingState = {
  shownThisSession: 0,
  lastShownAt: 0,
};

/** Defaults used when Remote Config has no value (or returns 0). */
const DEFAULT_MIN_LEVEL = 6; // ~boosters-unlock pacing: the loop is understood by then
const DEFAULT_MAX_PER_SESSION = 3;
const DEFAULT_COOLDOWN_MINUTES = 8;

function configuredMinLevel(): number {
  const value = getRemoteNumber('offerMinLevel');
  return value > 0 ? value : DEFAULT_MIN_LEVEL;
}

function configuredMaxPerSession(): number {
  const value = getRemoteNumber('offerMaxPerSession');
  return value > 0 ? value : DEFAULT_MAX_PER_SESSION;
}

function configuredCooldownMs(): number {
  const minutes = getRemoteNumber('offerCooldownMinutes');
  return (minutes > 0 ? minutes : DEFAULT_COOLDOWN_MINUTES) * 60_000;
}

/**
 * Whether a purchase offer may be shown right now.
 *
 * `now` is injectable so tests don't depend on wall-clock timing.
 */
export function canShowOfferNow(puzzlesSolved: number, now: number = Date.now()): boolean {
  // Measured in puzzles actually completed, not level number: mode levels
  // advance independently, so a player could reach "level 6" in a side mode
  // having barely played. Puzzles solved is the honest experience signal.
  if (puzzlesSolved < configuredMinLevel()) return false;
  if (state.shownThisSession >= configuredMaxPerSession()) return false;
  // Gate the cooldown on "has anything been shown yet", NOT on a timestamp
  // sentinel — `lastShownAt > 0` silently disabled the cooldown for an offer
  // recorded at t=0.
  if (state.shownThisSession > 0 && now - state.lastShownAt < configuredCooldownMs()) {
    return false;
  }
  return true;
}

/** Record that an offer was actually shown. */
export function recordOfferShown(now: number = Date.now()): void {
  state.shownThisSession += 1;
  state.lastShownAt = now;
}

/** How many offers this session has already shown (analytics/debugging). */
export function offersShownThisSession(): number {
  return state.shownThisSession;
}

/** Reset — for tests, and for an explicit "new session" boundary. */
export function resetOfferPacing(): void {
  state.shownThisSession = 0;
  state.lastShownAt = 0;
}
