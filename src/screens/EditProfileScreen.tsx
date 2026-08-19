import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import ThemePreview from '../components/cosmetics/ThemePreview';
import { ProfileFrameArt } from '../components/cosmetics/ProfileFrameArt';
import { bentoPanel, bentoDividerColor } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import {
  usePlayerStore,
  usePlayerActions,
  selectCurrentLevel,
  selectEquippedFrame,
  selectEquippedTheme,
  selectEquippedTitle,
  selectUnlockedCosmetics,
} from '../stores/playerStore';
import {
  PROFILE_FRAMES,
  PROFILE_TITLES,
  COSMETIC_THEMES,
  getTitle,
  getTitleLabel,
} from '../data/cosmetics';
import { ProfileFrame, ProfileTitle, CosmeticTheme } from '../types';

const RARITY_COLORS: Record<string, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};

const LIST_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
/**
 * Frame cards are sized so ~2.5 cards fit the viewport: two full cards plus a
 * clean half-card "peek" — the industry affordance that says "this row
 * scrolls" — instead of a third card harshly clipped at an arbitrary point.
 * Viewport = screen minus the scaffold's 16px content padding per side.
 */
const FRAME_CARD_SIZE = Math.round((SCREEN_WIDTH - 32 - 2 * LIST_GAP) / 2.5);
const THEME_CARD_SIZE = 136;

/** Small accent check bubble marking the equipped cosmetic. */
const CheckBadge: React.FC<{ color?: string }> = ({ color = COLORS.accent }) => (
  <View style={[styles.checkBadge, { backgroundColor: color, shadowColor: color }]}>
    <Text style={styles.checkBadgeText}>{'✓'}</Text>
  </View>
);

/**
 * GlyphMedallion — IconMedallion's layered-gem body, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function GlyphMedallion({
  size = 34,
  accent = COLORS.purple,
  muted = false,
  style,
  children,
}: {
  size?: number;
  accent?: string;
  muted?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: muted ? 'rgba(255,255,255,0.14)' : accent + '73',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
          shadowColor: muted ? '#000' : accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: muted ? 0.2 : 0.55,
          shadowRadius: size * 0.22,
          elevation: muted ? 2 : 6,
        },
        muted && { opacity: 0.55 },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          muted ? 'rgba(255,255,255,0.05)' : accent + '3D',
          'rgba(8, 2, 22, 0.92)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.16,
          right: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(255,255,255,0.14)',
        }}
      />
      {children}
    </View>
  );
}

/** Drawn mini padlock — ring shackle + gradient rounded-rect body + keyhole. */
function LockGlyph({ size = 18, accent = COLORS.gold }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.4,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderWidth: size * 0.11,
          borderBottomWidth: 0,
          borderColor: accent + 'D9',
          marginBottom: -size * 0.05,
        }}
      />
      <View
        style={{
          width: size * 0.82,
          height: size * 0.56,
          borderRadius: size * 0.14,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '8C']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            width: size * 0.16,
            height: size * 0.22,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(8,2,22,0.7)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn faceted gem — rotated gradient diamond with a light facet. */
function GemGlyph({ size = 10 }: { size?: number }) {
  const sq = size * 0.74;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: sq,
          height: sq,
          borderRadius: sq * 0.2,
          overflow: 'hidden',
          transform: [{ rotate: '45deg' }],
        }}
      >
        <LinearGradient
          colors={['#d9fbff', COLORS.cyan, '#0077a8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            position: 'absolute',
            top: sq * 0.1,
            left: sq * 0.1,
            width: sq * 0.36,
            height: sq * 0.36,
            borderRadius: sq * 0.12,
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn coin — gold gradient disc with inner ring + glint. */
function CoinGlyph({ size = 10 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LinearGradient
        colors={[COLORS.goldLight, COLORS.gold, '#a86f00']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          borderWidth: 1,
          borderColor: 'rgba(122,71,21,0.65)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          left: size * 0.18,
          width: size * 0.24,
          height: size * 0.16,
          borderRadius: size * 0.1,
          backgroundColor: 'rgba(255,255,255,0.5)',
        }}
      />
    </View>
  );
}

interface EditProfileScreenProps {
  navigation?: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const equippedFrame = usePlayerStore(selectEquippedFrame);
  const equippedTheme = usePlayerStore(selectEquippedTheme);
  const equippedTitle = usePlayerStore(selectEquippedTitle);
  const unlockedCosmetics = usePlayerStore(selectUnlockedCosmetics);
  const { equipCosmetic } = usePlayerActions();
  const equippedThemeData = useMemo(
    () => COSMETIC_THEMES.find((theme) => theme.id === equippedTheme) ?? COSMETIC_THEMES[0],
    [equippedTheme],
  );
  const equippedTitleLabel = useMemo(
    () => getTitleLabel(equippedTitle),
    [equippedTitle],
  );
  const previewGradients = useMemo(
    () =>
      [
        `${equippedThemeData.colors.surface}EE`,
        `${equippedThemeData.colors.bg}F8`,
      ] as [string, string],
    [equippedThemeData],
  );
  const playerName = useMemo(() => {
    const title = getTitle(equippedTitle);
    return title?.title === 'Newcomer' ? 'Player' : 'Player';
  }, [equippedTitle]);

  const isOwned = useCallback(
    (id: string) =>
      id === 'default' ||
      id === 'title_newcomer' ||
      unlockedCosmetics.includes(id),
    [unlockedCosmetics],
  );

  const sortedFrames = useMemo(() => {
    const equipped: ProfileFrame[] = [];
    const owned: ProfileFrame[] = [];
    const locked: ProfileFrame[] = [];
    for (const f of PROFILE_FRAMES) {
      if (f.id === equippedFrame) equipped.push(f);
      else if (isOwned(f.id)) owned.push(f);
      else locked.push(f);
    }
    return [...equipped, ...owned, ...locked];
  }, [equippedFrame, isOwned]);

  const sortedTitles = useMemo(() => {
    const equipped: ProfileTitle[] = [];
    const owned: ProfileTitle[] = [];
    const locked: ProfileTitle[] = [];
    for (const t of PROFILE_TITLES) {
      if (t.id === equippedTitle) equipped.push(t);
      else if (isOwned(t.id)) owned.push(t);
      else locked.push(t);
    }
    return [...equipped, ...owned, ...locked];
  }, [equippedTitle, isOwned]);

  const sortedThemes = useMemo(() => {
    const equipped: CosmeticTheme[] = [];
    const owned: CosmeticTheme[] = [];
    const locked: CosmeticTheme[] = [];
    for (const t of COSMETIC_THEMES) {
      if (t.id === equippedTheme) equipped.push(t);
      else if (isOwned(t.id)) owned.push(t);
      else locked.push(t);
    }
    return [...equipped, ...owned, ...locked];
  }, [equippedTheme, isOwned]);

  const equippedFrameData = useMemo(
    () => PROFILE_FRAMES.find((f) => f.id === equippedFrame) ?? PROFILE_FRAMES[0],
    [equippedFrame],
  );

  const frameRarityColor = RARITY_COLORS[equippedFrameData.rarity] ?? COLORS.rarityCommon;
  const initial = playerName.charAt(0).toUpperCase();

  // Hero avatar glow pulse — mirrors ProfileScreen's legendary ring treatment.
  // Legendary frames get the full breathing pulse; everything else keeps a
  // static neon ring. Respects reduce-motion and pauses when unfocused
  // (this screen stays mounted beneath pushed screens).
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const isLegendary = equippedFrameData.rarity === 'legendary';
  const glowPulse = useSharedValue(0);
  useEffect(() => {
    if (!isLegendary || reduceMotion || !isFocused) {
      cancelAnimation(glowPulse);
      glowPulse.value = 0;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowPulse);
  }, [isLegendary, reduceMotion, isFocused, glowPulse]);

  const animatedRingStyle = useAnimatedStyle(() => {
    if (!isLegendary || reduceMotion) {
      return { transform: [{ scale: 1 }], shadowOpacity: 0.7 };
    }
    const scale = 1 + glowPulse.value * 0.04;
    const shadowOpacity = 0.6 + glowPulse.value * 0.4;
    return { transform: [{ scale }], shadowOpacity };
  });

  const handleEquipFrame = useCallback(
    (frame: ProfileFrame) => {
      if (isOwned(frame.id)) equipCosmetic('frame', frame.id);
    },
    [isOwned, equipCosmetic],
  );

  const handleEquipTitle = useCallback(
    (title: ProfileTitle) => {
      if (isOwned(title.id)) equipCosmetic('title', title.id);
    },
    [isOwned, equipCosmetic],
  );

  const handleEquipTheme = useCallback(
    (theme: CosmeticTheme) => {
      if (isOwned(theme.id)) equipCosmetic('theme', theme.id);
    },
    [isOwned, equipCosmetic],
  );

  const renderFrameItem = useCallback(
    ({ item: frame }: { item: ProfileFrame }) => {
      const owned = isOwned(frame.id);
      const equipped = frame.id === equippedFrame;
      const rarityColor = RARITY_COLORS[frame.rarity] ?? COLORS.rarityCommon;

      return (
        <Pressable
          onPress={() => handleEquipFrame(frame)}
          accessibilityRole="button"
          accessibilityLabel={`${frame.name} frame, ${frame.rarity}${equipped ? ', equipped' : owned ? '' : ', locked'}`}
          accessibilityState={{ selected: equipped, disabled: !owned }}
          style={({ pressed }) => [
            styles.frameCard,
            { borderColor: owned ? rarityColor + '66' : rarityColor + '40' },
            equipped && {
              borderColor: rarityColor,
              ...SHADOWS.glow(rarityColor),
            },
            pressed && owned && styles.cardPressed,
          ]}
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Rarity glow wash behind the preview ring — locked cards keep a
              softer wash so rarity color still reads through the dim. */}
          <LinearGradient
            colors={[rarityColor + (owned ? '4D' : '21'), 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.8 }}
          />
          {/* Real frame art (ProfileFrameArt SVG ring) around a mini avatar
              disc. Locked frames render the SAME art, dimmed, with a small
              lock badge — the reward stays visible instead of hiding behind a
              placeholder lock medallion. Equipped highlight (card border +
              glow) stays OUTSIDE the frame art. */}
          <View style={!owned && styles.framePreviewLockedDim}>
            <ProfileFrameArt frameId={frame.id} size={76}>
              <View style={styles.framePreviewDisc}>
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <LinearGradient
                  colors={[rarityColor + '40', 'rgba(8,2,22,0)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.85 }}
                />
                <View style={styles.avatarGlyphStack}>
                  <Text style={[styles.framePreviewLetter, styles.framePreviewLetterUnder]}>
                    {initial}
                  </Text>
                  <Text
                    style={[
                      styles.framePreviewLetter,
                      { textShadowColor: rarityColor + 'B3' },
                    ]}
                  >
                    {initial}
                  </Text>
                </View>
              </View>
            </ProfileFrameArt>
          </View>
          {!owned && (
            <GlyphMedallion size={26} accent={rarityColor} style={styles.frameLockBadge}>
              <LockGlyph size={13} accent={rarityColor} />
            </GlyphMedallion>
          )}
          <Text style={[styles.frameName, !owned && styles.lockedText]} numberOfLines={1}>
            {frame.name}
          </Text>
          <Text style={[styles.frameRarity, { color: rarityColor }]}>
            {frame.rarity.charAt(0).toUpperCase() + frame.rarity.slice(1)}
          </Text>
          {equipped && (
            <View style={[styles.equippedBadge, SHADOWS.glow(COLORS.accent)]}>
              <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
            </View>
          )}
          {!owned && (
            <Text style={styles.sourceText} numberOfLines={2}>
              {frame.source}
            </Text>
          )}
          {equipped && <CheckBadge color={rarityColor} />}
        </Pressable>
      );
    },
    [isOwned, equippedFrame, handleEquipFrame, initial],
  );

  const renderThemeItem = useCallback(
    ({ item: theme }: { item: CosmeticTheme }) => {
      const owned = isOwned(theme.id);
      const equipped = theme.id === equippedTheme;

      return (
        <Pressable
          onPress={() => handleEquipTheme(theme)}
          accessibilityRole="button"
          accessibilityLabel={`${theme.name} theme${equipped ? ', equipped' : owned ? '' : ', locked'}`}
          accessibilityState={{ selected: equipped, disabled: !owned }}
          style={({ pressed }) => [
            styles.themeCard,
            { borderColor: owned ? theme.colors.accent + '66' : theme.colors.accent + '38' },
            equipped && {
              borderColor: theme.colors.accent,
              ...SHADOWS.glow(theme.colors.accent),
            },
            pressed && owned && styles.cardPressed,
          ]}
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[theme.colors.accent + (owned ? '3D' : '1A'), 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.8 }}
          />
          {/* Mini game-board vignette in the theme's palette */}
          <View style={styles.themeVignette}>
            <ThemePreview theme={theme} width={THEME_CARD_SIZE - 28} muted={!owned} />
          </View>
          {!owned && (
            <GlyphMedallion
              size={24}
              accent={theme.colors.accent}
              muted
              style={styles.themeLockBadge}
            >
              <LockGlyph size={11} accent={theme.colors.accent} />
            </GlyphMedallion>
          )}
          <Text style={[styles.themeName, !owned && styles.lockedText]} numberOfLines={1}>
            {theme.name}
          </Text>
          {equipped && (
            <View style={[styles.equippedBadge, SHADOWS.glow(COLORS.accent)]}>
              <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
            </View>
          )}
          {!owned && theme.cost && (
            <View style={styles.costRow}>
              <GlyphMedallion
                size={18}
                accent={theme.cost.currency === 'gems' ? COLORS.cyan : COLORS.gold}
              >
                {theme.cost.currency === 'gems' ? (
                  <GemGlyph size={10} />
                ) : (
                  <CoinGlyph size={10} />
                )}
              </GlyphMedallion>
              <Text style={styles.costText}>{theme.cost.amount}</Text>
            </View>
          )}
          {equipped && <CheckBadge color={theme.colors.accent} />}
        </Pressable>
      );
    },
    [isOwned, equippedTheme, handleEquipTheme],
  );

  return (
    <ScreenScaffold
      title="EDIT PROFILE"
      accent={COLORS.accent}
      backdrop="profile"
      onBack={() => navigation?.goBack()}
    >
      {/* Live Preview — dominant hero card. The equipped theme paints a
          full-bleed gradient across the card top so the preview reads as a
          showcase, not a settings group. */}
      <View style={[bentoPanel('pink', { padding: 0 }), styles.previewClip]}>
        <LinearGradient
          colors={previewGradients}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {/* Full-bleed equipped-theme wash across the card top */}
        <LinearGradient
          colors={[
            `${equippedThemeData.colors.accent}59`,
            `${equippedThemeData.colors.cellSelected}26`,
            'transparent',
          ]}
          style={styles.previewThemeBleed}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Soft rarity aura behind the avatar */}
        <LinearGradient
          colors={[frameRarityColor + '3D', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
        />
        <View style={styles.previewBody}>
          {/* Avatar stage — soft radial rings behind the disc so the hero
              area reads as designed set-dressing, not empty padding. The
              rings borrow the equipped frame's rarity color at low alpha and
              are clipped by the card shell (previewClip). */}
          <View style={styles.avatarStage}>
            <View style={styles.avatarBackdrop} pointerEvents="none">
              <View
                style={[
                  styles.backdropRing,
                  styles.backdropRingOuter,
                  { borderColor: frameRarityColor + '14' },
                ]}
              />
              <View
                style={[
                  styles.backdropRing,
                  styles.backdropRingMid,
                  { borderColor: frameRarityColor + '24' },
                ]}
              />
              <View
                style={[
                  styles.backdropRing,
                  styles.backdropRingInner,
                  {
                    borderColor: frameRarityColor + '38',
                    backgroundColor: frameRarityColor + '0D',
                  },
                ]}
              />
            </View>
          <Animated.View
            style={[
              styles.avatarRing,
              {
                borderColor: frameRarityColor,
                shadowColor: frameRarityColor,
                backgroundColor: equippedThemeData.colors.bg,
              },
              animatedRingStyle,
            ]}
          >
            <View style={styles.avatarCircle}>
              <LinearGradient
                colors={[equippedThemeData.colors.surface, equippedThemeData.colors.bg]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              {/* Rarity-tinted radial-ish wash + bottom counter-glow */}
              <LinearGradient
                colors={[frameRarityColor + '3D', 'rgba(8,2,22,0)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.72 }}
              />
              <LinearGradient
                colors={['rgba(8,2,22,0)', frameRarityColor + '20']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0.45 }}
                end={{ x: 0.5, y: 1 }}
              />
              {/* Subtle geometric backdrop — orbit ring + rotated diamonds */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={[styles.avatarOrbit, { borderColor: frameRarityColor + '26' }]} />
                <View style={[styles.avatarDiamond, { borderColor: frameRarityColor + '30' }]} />
                <View style={styles.avatarDiamondSmall} />
              </View>
              {/* Dual-layer bevel monogram + glass top shine */}
              <View style={styles.avatarGlyphStack}>
                <Text style={[styles.avatarLetter, styles.avatarLetterUnder]}>{initial}</Text>
                <Text style={[styles.avatarLetter, { color: equippedThemeData.colors.accent }]}>{initial}</Text>
              </View>
              <View style={styles.avatarShine} pointerEvents="none" />
            </View>
          </Animated.View>
          </View>
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[
                equippedThemeData.colors.accent,
                equippedThemeData.colors.cellSelected,
              ]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.levelText}>Lv.{currentLevel}</Text>
          </View>
          <Text style={styles.playerName}>{playerName}</Text>
          <View
            style={[
              styles.titleBadge,
              {
                borderColor: `${equippedThemeData.colors.accent}55`,
                backgroundColor: `${equippedThemeData.colors.bg}AA`,
              },
            ]}
          >
            <Text style={[styles.titleText, { color: equippedThemeData.colors.accent }]}>
              {equippedTitleLabel}
            </Text>
          </View>
          <Text style={styles.frameLabelText}>
            {equippedFrameData.name} Frame
          </Text>
        </View>
      </View>

      {/* Profile Frames */}
      <SectionHeader label="PROFILE FRAMES" accent={COLORS.pink} />
      <FlatList
        data={sortedFrames}
        renderItem={renderFrameItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.horizontalList, styles.framesListTail]}
        snapToInterval={FRAME_CARD_SIZE + LIST_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
      />

      {/* Profile Titles */}
      <SectionHeader label="PROFILE TITLES" accent={COLORS.purple} />
      <View style={[bentoPanel('purple', { padding: 0 }), styles.titlesClip]}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {sortedTitles.map((title, index) => {
          const owned = isOwned(title.id);
          const equipped = title.id === equippedTitle;

          return (
            <React.Fragment key={title.id}>
              {index > 0 && (
                <View
                  style={[styles.titleDivider, { backgroundColor: bentoDividerColor('purple') }]}
                />
              )}
              <Pressable
                onPress={() => handleEquipTitle(title)}
                accessibilityRole="button"
                accessibilityLabel={`${title.title} title${equipped ? ', equipped' : owned ? '' : ', locked'}`}
                accessibilityState={{ selected: equipped, disabled: !owned }}
                style={({ pressed }) => [
                  styles.titleRow,
                  equipped && { backgroundColor: COLORS.purple + '14' },
                  pressed && owned && styles.rowPressed,
                ]}
              >
                <View style={styles.titleRowLeft}>
                  {!owned && (
                    <GlyphMedallion
                      size={26}
                      accent={COLORS.purple}
                      muted
                      style={styles.titleLockBadge}
                    >
                      <LockGlyph size={12} accent={COLORS.purpleLight} />
                    </GlyphMedallion>
                  )}
                  <Text
                    style={[
                      styles.titleName,
                      equipped && { color: equippedThemeData.colors.accent },
                      !owned && styles.lockedText,
                    ]}
                  >
                    {title.title}
                  </Text>
                </View>
                <View style={styles.titleRowRight}>
                  {equipped ? (
                    <View style={[styles.equippedPill, SHADOWS.glow(COLORS.accent)]}>
                      <Text style={styles.equippedPillText}>EQUIPPED</Text>
                    </View>
                  ) : owned ? (
                    <Text style={styles.tapToEquipText}>Tap to equip</Text>
                  ) : (
                    <Text style={styles.titleSourceText} numberOfLines={1}>
                      {title.source}
                    </Text>
                  )}
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {/* Color Themes */}
      <SectionHeader label="COLOR THEMES" accent={COLORS.cyan} />
      <FlatList
        data={sortedThemes}
        renderItem={renderThemeItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        snapToInterval={THEME_CARD_SIZE + LIST_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  // Preview card
  previewClip: {
    overflow: 'hidden',
    marginTop: 4,
  },
  previewBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    // Tightened ~25% (30 → 22): the backdrop rings now dress the space, so
    // the hero no longer needs padding to justify its footprint.
    paddingVertical: 22,
  },
  // Avatar stage + decorative backdrop rings (behind the avatar circle).
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  backdropRingOuter: {
    width: 216,
    height: 216,
    borderRadius: 108,
  },
  backdropRingMid: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  backdropRingInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
  },
  // Equipped-theme gradient bleeding from the card's top edge.
  previewThemeBleed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
  },
  avatarRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  avatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 52,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  // Dark offset copy rendered UNDER the lit glyph — reads as a bevel edge.
  avatarLetterUnder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(5,0,16,0.65)',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    transform: [{ translateY: 2.5 }, { translateX: 1.5 }],
  },
  avatarGlyphStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Low-alpha geometric backdrop inside the 94px disc (clipped by the circle).
  avatarOrbit: {
    position: 'absolute',
    alignSelf: 'center',
    top: 8,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  avatarDiamond: {
    position: 'absolute',
    alignSelf: 'center',
    top: 24,
    width: 68,
    height: 68,
    borderWidth: 1.5,
    borderRadius: 12,
    transform: [{ rotate: '45deg' }],
  },
  avatarDiamondSmall: {
    position: 'absolute',
    alignSelf: 'center',
    top: 36,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.09)',
    transform: [{ rotate: '45deg' }],
  },
  avatarShine: {
    position: 'absolute',
    top: 10,
    left: 22,
    right: 22,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ scaleY: 0.8 }],
  },
  levelBadge: {
    marginTop: -12,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 3,
    zIndex: 1,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  levelText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },
  playerName: {
    fontSize: 27,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginTop: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleBadge: {
    marginTop: 6,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
  },
  titleText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  frameLabelText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  // Horizontal lists
  horizontalList: {
    paddingRight: 16,
    paddingVertical: 6,
    gap: LIST_GAP,
  },
  // Extra tail room for the frames carousel so its last card snaps fully
  // clear of the screen edge instead of resting against it.
  framesListTail: {
    paddingRight: 32,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },

  // Frame cards
  frameCard: {
    width: FRAME_CARD_SIZE,
    borderRadius: RADIUS.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  // Avatar disc under ProfileFrameArt's SVG ring — ~88% of the 76px art box
  // so the frame band seats on its rim (same ratio as ProfileScreen's hero).
  framePreviewDisc: {
    width: 67,
    height: 67,
    borderRadius: 33.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  framePreviewLetter: {
    fontSize: 25,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // Locked frame preview: dimmed to ~55% but still fully drawn.
  framePreviewLockedDim: {
    opacity: 0.55,
  },
  frameLockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  framePreviewLetterUnder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(5,0,16,0.6)',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    transform: [{ translateY: 1.5 }, { translateX: 1 }],
  },
  frameName: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  frameRarity: {
    fontSize: 9,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 9,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Title rows
  titlesClip: {
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  titleDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  titleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleRowRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  titleLockBadge: {
    marginRight: 10,
  },
  titleName: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  tapToEquipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
  },
  titleSourceText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    maxWidth: 140,
  },

  // Theme cards
  themeCard: {
    width: THEME_CARD_SIZE,
    borderRadius: RADIUS.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  themeVignette: {
    marginTop: 2,
    marginBottom: 9,
    borderRadius: 10,
    overflow: 'hidden',
  },
  themeLockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  themeName: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  costText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },

  // Shared
  equippedBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  equippedBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  equippedPill: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  equippedPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
  },
  checkBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  lockedText: {
    color: COLORS.textMuted,
  },
});

export default EditProfileScreen;
