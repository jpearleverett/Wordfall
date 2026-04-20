import React, { useEffect, useMemo, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { perfCountCellRender } from '../utils/perfInstrument';
import { useColors } from '../hooks/useColors';

// ── Pre-computed style constants (module scope so tuples share a single reference) ─
const BODY_COLORS_VALID: [string, string, string, string, string] = ['#33ffaa', '#00ff87', '#00d96e', '#00b85c', '#008844'];
const BODY_COLORS_SELECTED_HINT: [string, string, string, string, string] = ['#fff0b3', '#ffe580', '#ffd24d', '#ffb800', '#cc9200'];
const BODY_COLORS_SELECTED: [string, string, string, string, string] = ['#ff8fd0', '#ff6eb8', '#ff2d95', '#e91e8c', '#b8147a'];
const BODY_COLORS_WILDCARD = [...GRADIENTS.tile.wildcard] as [string, string, ...string[]];
const BODY_COLORS_DEFAULT: [string, string, string, string, string] = ['#4a2580', '#3d1e6d', '#2d1452', '#221040', '#160a2e'];

const HIGHLIGHT_VALID: [string, string] = ['rgba(200,255,230,0.65)', 'rgba(0,255,135,0.0)'];
const HIGHLIGHT_SELECTED_HINT: [string, string] = ['rgba(255,245,200,0.65)', 'rgba(255,184,0,0.0)'];
const HIGHLIGHT_SELECTED: [string, string] = ['rgba(255,210,240,0.60)', 'rgba(255,45,149,0.0)'];
const HIGHLIGHT_DEFAULT: [string, string] = ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.0)'];

const DEFAULT_BORDER_COLOR = 'rgba(200, 77, 255, 0.40)';

const GRADIENT_START_02_0 = { x: 0.2, y: 0 };
const GRADIENT_END_08_1 = { x: 0.8, y: 1 };
const GRADIENT_START_05_0 = { x: 0.5, y: 0 };
const GRADIENT_END_05_055 = { x: 0.5, y: 0.55 };

// ── Accessibility helpers ────────────────────────────────────────────────────
interface A11yArgs {
  letter: string;
  isWildcard: boolean;
  isSelected: boolean;
  isValidWord: boolean;
  isHinted: boolean;
  selectionIndex: number;
  row?: number;
  col?: number;
  currentWord?: string;
}

function buildA11yLabel(a: A11yArgs): string {
  const parts: string[] = [];
  parts.push(a.isWildcard ? 'Wildcard' : `Letter ${a.letter}`);
  if (a.row !== undefined && a.col !== undefined) {
    // 1-indexed for screen-reader readability
    parts.push(`row ${a.row + 1} column ${a.col + 1}`);
  }
  if (a.isValidWord) {
    parts.push(`part of valid word${a.currentWord ? ` ${a.currentWord}` : ''}`);
  } else if (a.isSelected) {
    parts.push(
      a.selectionIndex >= 0
        ? `selected, position ${a.selectionIndex + 1}`
        : 'selected',
    );
    if (a.currentWord && a.currentWord.length > 0) {
      parts.push(`current word ${a.currentWord}`);
    }
  }
  if (a.isHinted && !a.isSelected) {
    parts.push('hint');
  }
  return parts.join(', ');
}

interface LetterCellProps {
  letter: string;
  cellId: string;
  size: number;
  isSelected: boolean;
  isHinted: boolean;
  selectionIndex: number;
  isValidWord?: boolean;
  isMoved?: boolean;
  isWildcard?: boolean;
  isSpotlightDimmed?: boolean;
  /**
   * Gravity fall drivers (April 2026 perf pass). `fallFromRows` is the
   * number of grid rows this tile fell by (positive). The tile starts
   * rendered `fallFromRows * (size + CELL_GAP)` above its final position
   * and springs back to zero. `fallDelayMs` staggers tiles by column.
   * `fallTick` is a monotonic counter bumped once per gravity event so
   * LetterCell can distinguish "fell again by the same amount" from "no
   * new gravity this render." All animation happens UI-thread via
   * Reanimated — no JS→native bridge traffic per tile.
   */
  fallFromRows?: number;
  fallDelayMs?: number;
  fallTick?: number;
  /** Grid row index (0-based). Used to build screen-reader position hints. */
  row?: number;
  /** Grid column index (0-based). Used to build screen-reader position hints. */
  col?: number;
  /** The word currently being built from selected letters. Announced in the hint. */
  currentWord?: string;
}

export const LetterCell = React.memo(function LetterCell({
  letter,
  cellId,
  size,
  isSelected,
  isHinted,
  selectionIndex,
  isValidWord = false,
  isMoved = false,
  isWildcard = false,
  isSpotlightDimmed = false,
  fallFromRows,
  fallDelayMs,
  fallTick,
  row,
  col,
  currentWord,
}: LetterCellProps) {
  // Dev-only: count how many LetterCell renders happen per Grid commit.
  // If memoization is working we expect ~1 render per tap.
  perfCountCellRender();
  const palette = useColors();
  // All per-cell animations run on the Reanimated worklet runtime so
  // state changes on multiple cells at once (valid-word drag, chain
  // clear, gravity) don't serialize through the JS bridge. The outer
  // wrapper's translateY is fed from `fallTranslateY` — triggered by a
  // `fallTick` counter bumped once per gravity event in GameScreen.
  const scaleAnim = useSharedValue(1);
  const movedAnim = useSharedValue(0);
  const fallTranslateY = useSharedValue(0);
  const lastFallTickRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (fallTick === undefined) return;
    if (fallTick === lastFallTickRef.current) return;
    lastFallTickRef.current = fallTick;
    if (!fallFromRows || fallFromRows <= 0) {
      // Cell did not fall this pass — clear any residual offset.
      fallTranslateY.value = 0;
      return;
    }
    // Start above the final position and spring back. Matches the visual
    // profile of the old Animated.spring({ tension: 180, friction: 9 }).
    const stride = size + 6; // CELL_GAP is 6 in constants.ts
    const offsetPx = -(fallFromRows * stride);
    fallTranslateY.value = offsetPx;
    const delay = fallDelayMs ?? 0;
    fallTranslateY.value = delay > 0
      ? withDelay(delay, withSpring(0, { damping: 12, stiffness: 180 }))
      : withSpring(0, { damping: 12, stiffness: 180 });
  }, [fallTick, fallFromRows, fallDelayMs, size, fallTranslateY]);

  useEffect(() => {
    // One withSequence call per selection change. Scale pop is the only
    // active feedback now — the decorative rings (ripple/overcharge/glow)
    // were removed because their mount/unmount dominated the native commit
    // phase when multiple cells changed state at once.
    if (isSelected) {
      // friction 3.5 / tension 260 → damping ≈ 7 / stiffness 260 for a
      // similarly bouncy pop (Reanimated uses damping+stiffness directly).
      scaleAnim.value = withSequence(
        withTiming(0.86, { duration: 60 }),
        withSpring(1.08, { damping: 7, stiffness: 260 }),
      );
    } else {
      scaleAnim.value = withSpring(1, { damping: 12, stiffness: 180 });
    }
  }, [isSelected, scaleAnim]);

  useEffect(() => {
    if (isMoved) {
      movedAnim.value = 1;
      movedAnim.value = withTiming(0, { duration: 400 });
    }
  }, [isMoved, movedAnim]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));
  const movedOpacityStyle = useAnimatedStyle(() => ({
    opacity: movedAnim.value,
  }));

  const borderRadius = size * 0.20;
  const insetBR = Math.max(borderRadius - 2, 2);

  // Memoize all style tuples/colors — only recompute when the boolean state flags change.
  const {
    bodyColors,
    topHighlightColors,
    borderColor,
    shadowColor,
  } = useMemo(() => {
    let body: [string, string, ...string[]];
    if (isValidWord) body = BODY_COLORS_VALID;
    else if (isSelected && isHinted) body = BODY_COLORS_SELECTED_HINT;
    else if (isSelected) body = BODY_COLORS_SELECTED;
    else if (isWildcard) body = BODY_COLORS_WILDCARD;
    else body = BODY_COLORS_DEFAULT;

    let highlight: [string, string];
    if (isValidWord) highlight = HIGHLIGHT_VALID;
    else if (isSelected && isHinted) highlight = HIGHLIGHT_SELECTED_HINT;
    else if (isSelected) highlight = HIGHLIGHT_SELECTED;
    else highlight = HIGHLIGHT_DEFAULT;

    let border: string;
    if (isValidWord) border = palette.green;
    else if (isSelected && isHinted) border = palette.gold;
    else if (isSelected) border = palette.accent;
    else if (isWildcard) border = palette.gold;
    else border = DEFAULT_BORDER_COLOR;

    let shadow: string;
    if (isValidWord) shadow = palette.green;
    else if (isSelected) shadow = palette.accent;
    else if (isWildcard) shadow = palette.gold;
    else shadow = COLORS.purple;

    return {
      bodyColors: body,
      topHighlightColors: highlight,
      borderColor: border,
      shadowColor: shadow,
    };
  }, [isValidWord, isSelected, isHinted, isWildcard, palette]);

  // The outer wrapper is always a Reanimated.View regardless of props —
  // swapping component types forces a full subtree remount, which used
  // to dominate commit time during chain clears. The `outerAnimatedStyle`
  // combines spotlight-dim opacity + gravity-fall translateY so both
  // drivers run UI-thread without allocating new layouts.
  const outerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isSpotlightDimmed ? 0.3 : 1,
    transform: [{ translateY: fallTranslateY.value }],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={outerAnimatedStyle}
      accessibilityRole="button"
      accessibilityLabel={buildA11yLabel({
        letter,
        isWildcard,
        isSelected,
        isValidWord,
        isHinted,
        selectionIndex,
        row,
        col,
        currentWord,
      })}
      accessibilityHint={
        isSelected
          ? 'Tap again to deselect. Drag across connected tiles to build a word.'
          : 'Tap to start building a word from this letter.'
      }
      accessibilityState={{ selected: isSelected, disabled: isSpotlightDimmed }}
    >
      {/* Decorative overlay rings removed:
       *  - ripple ring (isSelected)
       *  - overcharge glow (isValidWord)
       *  - outer glow (isSelected || isValidWord)
       *
       * Each was a separate Animated.View that mounted/unmounted on
       * state changes. With N selected cells changing state at once
       * (valid-word drag, chain clear), that's 2-3N native view
       * allocations per commit, dominating the native commit phase
       * that the profiler traces showed as ~30-50ms per tap.
       *
       * The main body below already provides strong visual feedback
       * (scale pop, border color swap, shadow color/radius swap) for
       * all three states, so the rings were decorative, not essential.
       * Dropping them was the single biggest lever left for cutting
       * tap-to-commit latency.
       */}

      {isMoved && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderRadius: borderRadius + 2,
              borderWidth: 1.5,
              borderColor: palette.accent,
            },
            movedOpacityStyle,
          ]}
        />
      )}

      <Reanimated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor,
            borderWidth: isSelected || isValidWord ? 2 : isWildcard ? 1.5 : 1,
            shadowColor,
            shadowOpacity: (isSelected || isValidWord) ? 0.7 : 0.4,
            // shadowRadius was 16/8 — halved because the grid renders up to
            // 50 cells simultaneously and each shadow is a per-frame GPU blur.
            // 8/4 is still clearly visible but ~4x cheaper.
            shadowRadius: (isSelected || isValidWord) ? 8 : 4,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 4 : 2 },
            elevation: (isSelected || isValidWord) ? 8 : 4,
          },
          scaleStyle,
        ]}
      >
        {/* Body gradient — the tile's primary color fill. Kept. */}
        <LinearGradient
          colors={bodyColors}
          start={GRADIENT_START_02_0}
          end={GRADIENT_END_08_1}
          style={[StyleSheet.absoluteFillObject, { borderRadius: insetBR }]}
        />

        {/* Top highlight gradient — essential for the 3D glossy look. Kept. */}
        <LinearGradient
          colors={topHighlightColors}
          start={GRADIENT_START_05_0}
          end={GRADIENT_END_05_055}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '55%',
            borderTopLeftRadius: insetBR,
            borderTopRightRadius: insetBR,
          }}
        />

        {/* Top specular pinprick highlight. */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.06,
            left: size * 0.12,
            right: size * 0.12,
            height: size * 0.05,
            borderRadius: size * 0.025,
            backgroundColor: isSelected || isValidWord
              ? 'rgba(255,255,255,0.45)'
              : 'rgba(255,255,255,0.16)',
          }}
        />

        {/* Bottom shadow — was a LinearGradient, replaced with a solid-color
            bar which is visually equivalent (the gradient went transparent→black
            and was only 22%/50% alpha at the ends, which reads identically to
            a single 30% alpha band). Saves ~50 LinearGradients across the grid. */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: size * 0.15,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderBottomLeftRadius: insetBR,
            borderBottomRightRadius: insetBR,
          }}
        />

        {/* EdgeGloss LinearGradient removed — opacity was 0.03-0.06 and almost
            invisible against the body gradient, but rendering it cost one extra
            gradient per cell. */}

        {!isSelected && !isValidWord && (
          <Image
            source={LOCAL_IMAGES.tileGemTexture}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: insetBR,
              opacity: 0.18,
            }}
            resizeMode="cover"
          />
        )}

        {(isSelected || isValidWord) && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: insetBR,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
        )}

        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.46 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
            !isSelected && !isValidWord && styles.letterDefault,
          ]}
        >
          {isWildcard ? '★' : letter}
        </Text>

        {isSelected && selectionIndex >= 0 && !isValidWord && (
          <View
            style={[
              styles.indexBadge,
              {
                width: size * 0.28,
                height: size * 0.28,
                borderRadius: size * 0.14,
                backgroundColor: palette.accent,
                shadowColor: palette.accent,
              },
            ]}
          >
            <Text style={[styles.indexText, { fontSize: size * 0.14 }]}>
              {selectionIndex + 1}
            </Text>
          </View>
        )}

        {isValidWord && (
          <View
            style={[
              styles.checkBadge,
              {
                borderRadius: size * 0.14,
                width: size * 0.26,
                height: size * 0.26,
                backgroundColor: palette.green,
                shadowColor: palette.green,
              },
            ]}
          >
            <Text style={[styles.checkText, { fontSize: size * 0.14 }]}>✓</Text>
          </View>
        )}

      </Reanimated.View>
    </Reanimated.View>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    overflow: 'hidden',
  },
  letter: {
    color: COLORS.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#fff',
    textShadowColor: 'rgba(200,255,220,0.8)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  indexText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  checkText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
