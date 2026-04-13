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
          <Text style={styles.stuckText}>
            Stuck? Tap here to undo your last move
          </Text>
        </Pressable>
      )}
      {showRetryBanner && (
        <Pressable style={[styles.stuckBanner, styles.stuckBannerRetry]} onPress={onRetryTap}>
          <Text style={styles.stuckText}>
            No moves left — tap to retry this puzzle
          </Text>
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
});
