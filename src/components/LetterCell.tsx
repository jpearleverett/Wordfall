import React, { createContext, useContext, useEffect, useMemo } from 'react';
import {
  Animated,
  Image,
  Platform,
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { perfCountCellRender } from '../utils/perfInstrument';
import { useColors } from '../hooks/useColors';
import { useRoundedFontReady } from '../services/fontReady';
import { getRemoteBoolean } from '../services/remoteConfig';
import { CoinIcon } from './icons/iconsCore';
import { useColorblindMode } from '../services/colorblindPreference';
import { getColorblindTileRamps } from '../services/colorblind';

// ── Pre-computed style constants (module scope so tuples share a single reference) ─
const BODY_COLORS_VALID: [string, string, string, string, string] = ['#33ffaa', '#00ff87', '#00d96e', '#00b85c', '#008844'];
const BODY_COLORS_SELECTED_HINT: [string, string, string, string, string] = ['#fff0b3', '#ffe580', '#ffd24d', '#ffb800', '#cc9200'];
// Selected-tile gradient was originally ['#ff8fd0', …] — the top stop was too
// light against a white letter, so the text washed out on the upper half of
// traced tiles. Darkened the entry stops so the whole tile sits in a deeper
// magenta range that pushes white letters forward, while keeping the pink
// identity.
const BODY_COLORS_SELECTED: [string, string, string, string, string] = ['#d9267a', '#c0206c', '#a8185f', '#8a1250', '#6b0d3e'];
const BODY_COLORS_WILDCARD = [...GRADIENTS.tile.wildcard] as [string, string, ...string[]];
// Matches the brightened `space` wing ramp in data/chapters.ts (Aug 2026
// design review — the old near-black ramp read as murky next to AAA refs).
const BODY_COLORS_DEFAULT: [string, string, string, string, string] = ['#6a3cb5', '#57309c', '#44257e', '#321b5e', '#20113c'];
const IS_ANDROID = Platform.OS === 'android';

/**
 * Per-chapter tile tint. GameScreen computes a 5-stop gradient derived from
 * the chapter's backdrop palette (nature → green, ocean → blue, etc.) and
 * publishes it via this context. LetterCell falls back to the default
 * purple ramp when no provider is mounted (e.g. Daily mode, tests). The
 * provider value is memoized per-level in GameScreen so mid-puzzle state
 * changes don't reach the cell via this context — only level transitions
 * do, which re-render the grid anyway.
 */
export const TilePaletteContext = createContext<[string, string, string, string, string] | null>(null);

const HIGHLIGHT_VALID: [string, string] = ['rgba(200,255,230,0.65)', 'rgba(0,255,135,0.0)'];
const HIGHLIGHT_SELECTED_HINT: [string, string] = ['rgba(255,245,200,0.65)', 'rgba(255,184,0,0.0)'];
const HIGHLIGHT_SELECTED: [string, string] = ['rgba(255,210,240,0.60)', 'rgba(255,45,149,0.0)'];
// Lifted 0.22 → 0.34 (round-2 blind review: "flat gradient tiles lack
// material depth") — the stronger cap highlight is what sells the candy read.
const HIGHLIGHT_DEFAULT: [string, string] = ['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.0)'];

const DEFAULT_BORDER_COLOR = 'rgba(200, 77, 255, 0.40)';

/** #rrggbb → rgba() with the given alpha; non-hex passes through. */
function rampBorderColor(hex: string): string {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return DEFAULT_BORDER_COLOR;
  const n = parseInt(m[1], 16);
  // Lift toward white so the rim reads as a lit edge of the tile color.
  const r = Math.min(255, ((n >> 16) & 0xff) + 70);
  const g = Math.min(255, ((n >> 8) & 0xff) + 70);
  const b = Math.min(255, (n & 0xff) + 70);
  return `rgba(${r}, ${g}, ${b}, 0.55)`;
}

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
  reduceMotion: boolean;
  isSelected: boolean;
  isHinted: boolean;
  selectionIndex: number;
  isValidWord?: boolean;
  isWildcard?: boolean;
  isSpotlightDimmed?: boolean;
  /**
   * Variable-reward marker: this tile carries a coin bonus that pays out
   * when the word containing it is found. Renders a small gold coin badge.
   */
  isBonusTile?: boolean;
  /**
   * Animated.ValueXY driving the gravity-fall translation (pixels, animates
   * to {0,0}). XY so horizontal gravity (gravityFlip left/right) animates
   * exactly like vertical falls.
   */
  fallAnim?: Animated.ValueXY;
  /**
   * Absolute slot origin inside the grid container, straight from the
   * canonical geometry (already carries the half-gap inset on x; y starts at
   * row 0 = 0). Tiles are positioned rather than flowed so that a tile which
   * changes COLUMN — every clear under horizontal gravity in gravityFlip —
   * keeps its identity and its running fall animation instead of being
   * unmounted from one column's children and remounted in another's.
   */
  slotX?: number;
  slotY?: number;
  /** Slot pitch (cellSize + gap). The inner tile insets itself by the gap. */
  slotSize?: number;
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
  reduceMotion,
  isSelected,
  isHinted,
  selectionIndex,
  isValidWord = false,
  isWildcard = false,
  isSpotlightDimmed = false,
  isBonusTile = false,
  fallAnim,
  slotX,
  slotY,
  slotSize,
  row,
  col,
  currentWord,
}: LetterCellProps) {
  // Dev-only: count how many LetterCell renders happen per Grid commit.
  // If memoization is working we expect ~1 render per tap.
  perfCountCellRender();
  const palette = useColors();
  // Chapter-derived default tile gradient. Stable across a single level; a
  // level transition re-renders the whole grid anyway, so the extra context
  // subscription doesn't break the per-tap memoization of LetterCell.
  const chapterTileRamp = useContext(TilePaletteContext);
  // Typography + accessibility-aware visual overrides (Batch C, RC-gated).
  // All default OFF so the first release ships the current look; flip ON
  // remotely after soak. Subscribed here (not in GameScreen) so per-cell
  // updates don't tear through the whole grid on RC fetch.
  const roundedReady = useRoundedFontReady();
  const useRoundedFont =
    getRemoteBoolean('roundedDisplayFontEnabled') && roundedReady;
  const colorblindMode = useColorblindMode();
  // Vowel tint disabled under any colorblind mode — the CVD palette swap
  // owns tile-state color and a second layer would fight it.
  const useVowelTint =
    getRemoteBoolean('letterVowelTintEnabled') && colorblindMode === 'off';
  const useShadowBump =
    Platform.OS === 'ios' &&
    isSelected &&
    getRemoteBoolean('selectedTileShadowBumpEnabled');
  const raisedTile = isSelected || isValidWord;
  const androidElevation = IS_ANDROID ? (raisedTile ? 3 : 0) : (raisedTile ? 8 : 4);
  const isVowel = 'AEIOU'.includes(letter);
  // Scale-pop + moved-overlay animations are driven on the Reanimated
  // worklet runtime so state changes on multiple cells at once (valid-word
  // drag, chain clear) don't serialize through the JS bridge. The outer
  // wrapper below keeps the legacy Animated.Value for `fallAnim` because
  // that shared animated value is owned by GameScreen's gravity block
  // (fallAnimMap) and already runs with `useNativeDriver: true` — the
  // translateY animation is native-driven on the UI thread, not the JS
  // bridge, so the worklet/bridge split concern raised in the Tier 6
  // audit is much smaller than the header "legacy Animated" label
  // suggests. Full Reanimated migration was evaluated in Tier 6 B5 and
  // deferred — see `agent_docs/gotchas.md` for the tradeoff analysis.
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scaleAnim.value = 1;
      return;
    }
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
  }, [isSelected, reduceMotion, scaleAnim]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
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
    // Under a CVD mode the face color of selected/valid/hint tiles is
    // remapped too — the border override alone left a deutan player staring
    // at the exact magenta-vs-green face pair the palette exists to remove.
    const faceRamps = getColorblindTileRamps(colorblindMode);
    let body: [string, string, ...string[]];
    if (isValidWord) body = faceRamps?.valid ?? BODY_COLORS_VALID;
    else if (isSelected && isHinted) body = faceRamps?.selectedHint ?? BODY_COLORS_SELECTED_HINT;
    else if (isSelected) body = faceRamps?.selected ?? BODY_COLORS_SELECTED;
    else if (isWildcard) body = BODY_COLORS_WILDCARD;
    else body = chapterTileRamp ?? BODY_COLORS_DEFAULT;

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
    // Resting tiles rim in a lit edge of their own chapter color — a fixed
    // purple rim on e.g. green nature tiles read as a clash in the blind
    // design review.
    else border = chapterTileRamp ? rampBorderColor(chapterTileRamp[0]) : DEFAULT_BORDER_COLOR;

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
  }, [isValidWord, isSelected, isHinted, isWildcard, palette, chapterTileRamp, colorblindMode]);

  // CRITICAL: always use Animated.View, never swap between View and Animated.View
  // based on props. A component-type swap forces React to unmount the entire
  // cell subtree (12+ native views per cell) and remount a fresh one. When
  // fallActive toggles (on every word clear), the old code swapped all 50
  // cells between View and Animated.View — 50 × full-subtree remounts per word.
  // That was the single biggest cause of chain-clear lag on the puzzle screen.
  //
  // When fallAnim is undefined the transform is simply omitted and Animated.View
  // behaves identically to a plain View. The tiny cost of always using
  // Animated.View is trivial compared to the remount storm.
  const outerStyle = useMemo(() => {
    const s: any = {};
    if (slotX !== undefined && slotY !== undefined) {
      s.position = 'absolute';
      s.left = slotX;
      s.top = slotY;
      if (slotSize !== undefined) {
        s.width = slotSize;
        s.height = slotSize;
      }
    }
    if (isSpotlightDimmed) s.opacity = 0.3;
    if (fallAnim) s.transform = fallAnim.getTranslateTransform();
    return s;
  }, [isSpotlightDimmed, fallAnim, slotX, slotY, slotSize]);

  return (
    <Animated.View
      pointerEvents="none"
      style={outerStyle}
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

      {/* The old `isMoved` accent ring (a border flash on every tile that
          gravity displaced) was removed in the gravity-animation rework —
          the motion itself communicates the movement, and the ring's
          mount/flash/unmount cycle on up to ~20 tiles per clear read as
          flicker layered on top of the fall. */}

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
            shadowOpacity: IS_ANDROID ? 0 : useShadowBump ? 0.85 : raisedTile ? 0.7 : 0.4,
            // shadowRadius was 16/8 — halved because the grid renders up to
            // 50 cells simultaneously and each shadow is a per-frame GPU blur.
            // 8/4 is still clearly visible but ~4x cheaper. iOS shadow bump
            // (Batch C, RC-gated) lifts selected tiles to 12 for extra
            // pick-up feel. Android gets a tiny selected-only elevation and
            // skips per-tile shadow blur to avoid gradient-layer jank.
            shadowRadius: IS_ANDROID ? 0 : useShadowBump ? 12 : raisedTile ? 8 : 4,
            shadowOffset: { width: 0, height: raisedTile ? 4 : 2 },
            elevation: androidElevation,
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

        {/* Bevel rim — one View with per-side border colors fakes a lit
            top-left / shadowed bottom-right chamfer, giving the tile the
            physical "piece" read AAA boards have, at the cost of a single
            static native view per cell. */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: insetBR,
            borderWidth: 1.5,
            borderTopColor: 'rgba(255,255,255,0.40)',
            borderLeftColor: 'rgba(255,255,255,0.20)',
            borderRightColor: 'rgba(0,0,0,0.32)',
            borderBottomColor: 'rgba(0,0,0,0.46)',
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
            backgroundColor: raisedTile
              ? 'rgba(255,255,255,0.45)'
              : 'rgba(255,255,255,0.26)',
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

        {!IS_ANDROID && !raisedTile && (
          <Image
            source={LOCAL_IMAGES.tileGemTexture}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: insetBR,
              // 0.18 desaturated the brightened tile ramps back toward the
              // "murky" look the design review flagged.
              opacity: 0.1,
            }}
            resizeMode="cover"
          />
        )}

        {raisedTile && (
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
            { fontSize: size * 0.5 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
            !isSelected && !isValidWord && styles.letterDefault,
            useRoundedFont && { fontFamily: FONTS.displayRounded },
            useVowelTint &&
              !isSelected &&
              !isValidWord && { color: isVowel ? '#fff4d6' : '#e8e0ff' },
          ]}
        >
          {isWildcard ? '★' : letter}
        </Text>

        {/* Bonus coin badge — variable-reward marker. Static (no animation)
            so it doesn't break the per-tap memoization; the payoff moment
            (bloom + SFX + coin grant) is owned by GameScreen. */}
        {isBonusTile && (
          <View
            pointerEvents="none"
            style={[
              styles.bonusBadge,
              {
                width: size * 0.34,
                height: size * 0.34,
                borderRadius: size * 0.17,
                top: -size * 0.08,
                right: -size * 0.08,
              },
            ]}
          >
            <CoinIcon size={size * 0.23} />
          </View>
        )}

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
    </Animated.View>
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
    // Pure white, not the app's lavender textPrimary — on the chapter-tinted
    // tile ramps the lavender read as "letters lack punch" (round-4 blind
    // review). The dark halo below carries the contrast.
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 2 },
  },
  // Selected letters need a heavy dark halo — the gradient under them is
  // still pink and white-on-pink is a low-contrast read without the halo.
  // Radius bumped from 3 → 8, offset centered, so the text reads as a
  // crisp white glyph rimmed in near-black instead of a thin drop shadow.
  letterSelected: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,40,15,1)',
    textShadowRadius: 8,
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
  bonusBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(20, 6, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 5,
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
