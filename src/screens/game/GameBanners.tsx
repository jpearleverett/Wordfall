import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../constants';
import { GameMode, GameStatus, GravityDirection } from '../../types';

/**
 * GameBanners — the collection of conditional banner strips that float
 * over the grid area (gravity, shrinking, wildcard, idle hint, ad hint,
 * stuck, stuck-retry). None of these react to per-cell selection state,
 * so extracting them into a memoized subtree lets React.memo bail out
 * on every tap while GameScreen's body still re-runs.
 *
 * All callbacks must be stable (ref-wrapped or useCallback with empty deps
 * where possible) so the memo comparison succeeds.
 */
interface GameBannersProps {
  mode: GameMode;
  gravityDirection: GravityDirection;
  wordsUntilShrink: number;
  wildcardMode: boolean;
  status: GameStatus;
  showIdleHint: boolean;
  hintsAvailable: number;
  canShowAdHint: boolean;
  isStuck: boolean;
  undosLeft: number;
  /**
   * The remaining words that can no longer be traced at all — NOT simply the
   * remaining words. A board is "stuck" when no clearing order finishes it,
   * which does not imply every word is unreachable: some may still be
   * traceable and just lead nowhere. Naming one of those as "cut off" would
   * be a visibly false claim on the screen where the player is already
   * suspicious the game is broken, so the caller filters first.
   */
  strandedWords?: string[];
  /**
   * True until the player has been stuck once. The first dead end gets the
   * long explanation; after that the short form is enough and the long one
   * would just be in the way.
   */
  isFirstStuck?: boolean;
  /**
   * True when the current puzzle is a "challenge spike" level — the
   * designed-harder-than-surrounding-ramp kind. Shows a persistent
   * gold banner so the player understands why this puzzle feels
   * tougher than the last few. Computed from `isSpikeLevel(level)`
   * at mount in GameScreen.
   */
  isSpike?: boolean;
  onIdleHintTap: () => void;
  onAdHintTap: () => void;
  onUndoTap: () => void;
  onRetryTap: () => void;
}

function GameBannersImpl({
  mode,
  gravityDirection,
  wordsUntilShrink,
  wildcardMode,
  status,
  showIdleHint,
  hintsAvailable,
  canShowAdHint,
  isStuck,
  undosLeft,
  strandedWords,
  isFirstStuck = false,
  isSpike = false,
  onIdleHintTap,
  onAdHintTap,
  onUndoTap,
  onRetryTap,
}: GameBannersProps) {
  const isPlaying = status === 'playing';
  const showGravityBanner = mode === 'gravityFlip' && gravityDirection !== 'down';
  const showShrinkBanner = mode === 'shrinkingBoard' && wordsUntilShrink === 1 && isPlaying;
  const showWildcardBanner = wildcardMode;
  const showUndoBanner = isStuck && isPlaying && undosLeft > 0;
  const showRetryBanner = isStuck && isPlaying && undosLeft <= 0;

  // Name what actually went wrong. "Stuck?" asked a question the player
  // could already answer and taught nothing. When gravity has genuinely
  // buried a word, saying so gives them something concrete to look for and
  // makes the rule click; the shortest one is the easiest to scan the grid
  // for. When nothing is buried but no order finishes, say THAT instead —
  // claiming a still-traceable word is "cut off" reads as a bug.
  const stranded = strandedWords ?? [];
  const shortestStranded = stranded.reduce<string | null>(
    (best, w) => (best === null || w.length < best.length ? w : best),
    null,
  );
  const strandedHeadline =
    shortestStranded === null
      ? 'No order finishes this board'
      : stranded.length === 1
        ? `${shortestStranded} is cut off`
        : `${shortestStranded} and ${stranded.length - 1} more are cut off`;
  const showIdleHelpBanner =
    showIdleHint &&
    !showUndoBanner &&
    !showRetryBanner &&
    !showWildcardBanner &&
    isPlaying &&
    hintsAvailable > 0;
  const showAdHelpBanner =
    showIdleHint &&
    !showUndoBanner &&
    !showRetryBanner &&
    !showWildcardBanner &&
    isPlaying &&
    hintsAvailable === 0 &&
    canShowAdHint;

  return (
    <>
      {isSpike && isPlaying && (
        <View style={[styles.cascadeBar, styles.cascadeBarSpike]}>
          <Text style={[styles.cascadeText, styles.cascadeTextSpike]}>
            {'⚡'} CHALLENGE LEVEL
          </Text>
        </View>
      )}
      {showGravityBanner && (
        <View style={styles.cascadeBar}>
          <Text style={styles.cascadeText}>
            {'\uD83D\uDD04'} Gravity:{' '}
            {gravityDirection === 'right' ? '\u2192' : gravityDirection === 'up' ? '\u2191' : '\u2190'}
          </Text>
        </View>
      )}
      {showShrinkBanner && (
        <View style={[styles.cascadeBar, styles.cascadeBarCoral]}>
          <Text style={[styles.cascadeText, styles.cascadeTextCoral]}>
            {'\uD83D\uDD3B'} SHRINKING IN 1 WORD
          </Text>
        </View>
      )}
      {showWildcardBanner && (
        <View style={[styles.cascadeBar, styles.cascadeBarGold]}>
          <Text style={[styles.cascadeText, styles.cascadeTextGold]}>
            {'\u2605'} Tap a cell to place wildcard
          </Text>
        </View>
      )}
      {showIdleHelpBanner && (
        <Pressable style={styles.idleHintBanner} onPress={onIdleHintTap}>
          <Text style={styles.idleHintText}>
            Need help? Tap here or press {'\uD83D\uDCA1'} for a hint
          </Text>
        </Pressable>
      )}
      {showAdHelpBanner && (
        <Pressable style={styles.adHintBanner} onPress={onAdHintTap}>
          <Text style={styles.adHintBannerText}>
            {'\uD83C\uDFAC'} Out of hints — watch ad for +1 hint
          </Text>
        </Pressable>
      )}
      {showUndoBanner && (
        <Pressable style={styles.stuckBanner} onPress={onUndoTap}>
          <Text style={styles.stuckText}>{strandedHeadline} — tap to step back a move</Text>
          {isFirstStuck && (
            <Text style={styles.stuckSubtext}>
              {shortestStranded === null
                ? 'The words are all still there, just not in an order that finishes. Step back and clear a different one first.'
                : 'Clearing a word drops the letters above it. Clear that one earlier next time.'}
            </Text>
          )}
        </Pressable>
      )}
      {showRetryBanner && (
        <Pressable style={[styles.stuckBanner, styles.stuckBannerRetry]} onPress={onRetryTap}>
          <Text style={styles.stuckText}>{strandedHeadline} — tap to retry this puzzle</Text>
        </Pressable>
      )}
    </>
  );
}

export const GameBanners = React.memo(GameBannersImpl);

const styles = StyleSheet.create({
  cascadeBar: {
    backgroundColor: 'rgba(50, 15, 20, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.40)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cascadeBarCoral: {
    borderColor: COLORS.coral,
  },
  cascadeBarGold: {
    borderColor: COLORS.gold,
  },
  cascadeBarSpike: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(50, 35, 10, 0.85)',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  cascadeTextSpike: {
    color: COLORS.gold,
    textShadowColor: 'rgba(255, 184, 0, 0.6)',
    textShadowRadius: 12,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  cascadeText: {
    fontFamily: FONTS.display,
    color: COLORS.coral,
    fontSize: 14,
    letterSpacing: 0.5,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 10,
  },
  cascadeTextCoral: {
    color: COLORS.coral,
  },
  cascadeTextGold: {
    color: COLORS.gold,
  },
  idleHintBanner: {
    backgroundColor: 'rgba(255, 45, 149, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 149, 0.2)',
  },
  idleHintText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  adHintBanner: {
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
  },
  adHintBannerText: {
    color: COLORS.green,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  stuckBanner: {
    backgroundColor: 'rgba(255, 82, 82, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 4,
  },
  stuckBannerRetry: {
    backgroundColor: 'rgba(168, 85, 247, 0.85)',
  },
  stuckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  stuckSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
