// Deep link routing — pins the two flows that used to drop links:
// (1) the 'daily' link must carry a generated board (GameScreenWrapper
//     renders a dead "No puzzle loaded" screen without one), and
// (2) navigation links received while navigation isn't ready must be
//     buffered and replayed, not silently dropped.

import {
  NAV_LINK_TYPES,
  createPendingLinkReplayer,
  isValidClubId,
  resolveDeepLinkNav,
} from '../deepLinkRouter';
import { parseDeepLink } from '../../utils/deepLinking';
import { generateDailyBoard } from '../../engine/boardGenerator';
import { Board } from '../../types';

const FIXED_NOW = new Date('2026-08-24T12:00:00Z');
const FIXED_DATE = '2026-08-24';

describe('resolveDeepLinkNav', () => {
  it('daily resolves to a Game navigation WITH a generated board', () => {
    const resolution = resolveDeepLinkNav(parseDeepLink('wordfall://daily'), FIXED_NOW);
    expect(resolution.kind).toBe('navigate');
    if (resolution.kind !== 'navigate') return;
    expect(resolution.target).toBe('Home');
    const params = resolution.params as {
      screen: string;
      initial: boolean;
      params: { board: Board; level: number; mode: string; isDaily: boolean };
    };
    expect(params.screen).toBe('Game');
    // Keep the initial route beneath Game so back-navigation works on a
    // cold start (the stack would otherwise mount Game as its only route).
    expect(params.initial).toBe(false);
    // Same params startDaily passes — a board, not just a mode.
    expect(params.params.board).toBeDefined();
    expect(params.params.board.words.length).toBeGreaterThan(0);
    expect(params.params.level).toBe(0);
    expect(params.params.mode).toBe('daily');
    expect(params.params.isDaily).toBe(true);
    // Board comes from the shared daily generator (cached per date), so a
    // link-opened daily and a home-screen daily are the identical puzzle.
    expect(params.params.board).toBe(generateDailyBoard(FIXED_DATE));
  });

  it('club_invite resolves to Profile > Club with joinClubId', () => {
    const resolution = resolveDeepLinkNav(parseDeepLink('wordfall://club/abc-123'), FIXED_NOW);
    expect(resolution).toEqual({
      kind: 'navigate',
      target: 'Profile',
      params: {
        screen: 'Club',
        initial: false,
        params: { joinClubId: 'abc-123' },
      },
    });
  });

  it('malformed club ids resolve to invalid_club, not a navigate', () => {
    expect(resolveDeepLinkNav({ type: 'club_invite', clubId: 'has spaces' }, FIXED_NOW)).toEqual({
      kind: 'invalid_club',
    });
    expect(resolveDeepLinkNav({ type: 'club_invite', clubId: 'x'.repeat(65) }, FIXED_NOW)).toEqual({
      kind: 'invalid_club',
    });
    expect(resolveDeepLinkNav({ type: 'club_invite' }, FIXED_NOW)).toEqual({
      kind: 'invalid_club',
    });
  });

  it('challenge resolves to the Play tab (no accept flow yet)', () => {
    expect(resolveDeepLinkNav(parseDeepLink('wordfall://challenge/xyz'), FIXED_NOW)).toEqual({
      kind: 'navigate',
      target: 'Play',
    });
  });

  it('referral and unknown links are not navigation links', () => {
    expect(resolveDeepLinkNav({ type: 'referral', referralCode: 'ABC' }, FIXED_NOW)).toEqual({
      kind: 'ignore',
    });
    expect(resolveDeepLinkNav({ type: 'unknown' }, FIXED_NOW)).toEqual({ kind: 'ignore' });
    expect(NAV_LINK_TYPES.has('referral')).toBe(false);
    expect(NAV_LINK_TYPES.has('daily')).toBe(true);
    expect(NAV_LINK_TYPES.has('club_invite')).toBe(true);
    expect(NAV_LINK_TYPES.has('challenge')).toBe(true);
  });

  it('validates club ids', () => {
    expect(isValidClubId('Club_01-a')).toBe(true);
    expect(isValidClubId('')).toBe(false);
    expect(isValidClubId('bad/slash')).toBe(false);
    expect(isValidClubId(undefined)).toBe(false);
  });
});

describe('createPendingLinkReplayer', () => {
  it('delivers immediately when navigation is ready', () => {
    const delivered: string[] = [];
    const replayer = createPendingLinkReplayer({
      isReady: () => true,
      deliver: (url) => delivered.push(url),
    });
    expect(replayer.receive('wordfall://daily')).toBe('delivered');
    expect(delivered).toEqual(['wordfall://daily']);
    expect(replayer.peek()).toBeNull();
  });

  it('buffers when not ready, then replays exactly once when ready', () => {
    let ready = false;
    const delivered: string[] = [];
    const replayer = createPendingLinkReplayer({
      isReady: () => ready,
      deliver: (url) => delivered.push(url),
    });
    // Cold start behind the consent gate: buffered, not dropped.
    expect(replayer.receive('wordfall://club/abc')).toBe('buffered');
    expect(delivered).toEqual([]);
    expect(replayer.peek()).toBe('wordfall://club/abc');
    // Still not ready — flush is a no-op.
    expect(replayer.flush()).toBe(false);
    expect(delivered).toEqual([]);
    // Consent accepted + onboarding finished: replay fires once.
    ready = true;
    expect(replayer.flush()).toBe(true);
    expect(delivered).toEqual(['wordfall://club/abc']);
    // Never twice.
    expect(replayer.flush()).toBe(false);
    expect(delivered).toEqual(['wordfall://club/abc']);
    expect(replayer.peek()).toBeNull();
  });

  it('keeps only the latest buffered link (last one wins)', () => {
    let ready = false;
    const delivered: string[] = [];
    const replayer = createPendingLinkReplayer({
      isReady: () => ready,
      deliver: (url) => delivered.push(url),
    });
    replayer.receive('wordfall://club/first');
    replayer.receive('wordfall://club/second');
    ready = true;
    expect(replayer.flush()).toBe(true);
    expect(delivered).toEqual(['wordfall://club/second']);
  });
});
