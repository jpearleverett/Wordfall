import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
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
import IconMedallion from '../components/common/IconMedallion';
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

const FRAME_CARD_SIZE = 104;
const THEME_CARD_SIZE = 112;
const LIST_GAP = 12;

/** Small accent check bubble marking the equipped cosmetic. */
const CheckBadge: React.FC<{ color?: string }> = ({ color = COLORS.accent }) => (
  <View style={[styles.checkBadge, { backgroundColor: color, shadowColor: color }]}>
    <Text style={styles.checkBadgeText}>{'✓'}</Text>
  </View>
);

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
            { borderColor: owned ? rarityColor + '55' : COLORS.borderDisabled },
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
          {/* Rarity glow wash behind the preview ring */}
          {owned && (
            <LinearGradient
              colors={[rarityColor + '2E', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.8 }}
            />
          )}
          {owned ? (
            <View
              style={[
                styles.framePreviewRing,
                {
                  borderColor: rarityColor,
                  shadowColor: rarityColor,
                },
              ]}
            >
              <View style={styles.framePreviewCircle}>
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.framePreviewLetter}>{initial}</Text>
              </View>
            </View>
          ) : (
            <IconMedallion glyph={'\u{1F512}'} size={50} accent={rarityColor} muted />
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
            { borderColor: owned ? theme.colors.accent + '55' : COLORS.borderDisabled },
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
          {owned && (
            <LinearGradient
              colors={[theme.colors.accent + '24', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.8 }}
            />
          )}
          {/* Color swatches */}
          <View style={styles.swatchRow}>
            {[theme.colors.bg, theme.colors.surface, theme.colors.accent, theme.colors.cellSelected].map(
              (color, i) => (
                <View
                  key={i}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    !owned && { opacity: 0.4 },
                  ]}
                />
              ),
            )}
          </View>
          {!owned && (
            <IconMedallion
              glyph={'\u{1F512}'}
              size={24}
              accent={theme.colors.accent}
              muted
              style={styles.themeLockBadge}
            />
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
              <IconMedallion
                glyph={theme.cost.currency === 'gems' ? '\u{1F48E}' : '\u{1FA99}'}
                size={18}
                accent={theme.cost.currency === 'gems' ? COLORS.cyan : COLORS.gold}
              />
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
      {/* Live Preview — hero card */}
      <View style={[bentoPanel('pink', { padding: 0 }), styles.previewClip]}>
        <LinearGradient
          colors={previewGradients}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {/* Soft rarity aura behind the avatar */}
        <LinearGradient
          colors={[frameRarityColor + '30', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
        />
        <View style={styles.previewBody}>
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
              <Text style={[styles.avatarLetter, { color: equippedThemeData.colors.accent }]}>{initial}</Text>
            </View>
          </Animated.View>
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
        contentContainerStyle={styles.horizontalList}
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
                    <IconMedallion
                      glyph={'\u{1F512}'}
                      size={26}
                      accent={COLORS.purple}
                      muted
                      style={styles.titleLockBadge}
                    />
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
    padding: 24,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
    elevation: 12,
  },
  avatarCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 42,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
    fontSize: 24,
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
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },

  // Frame cards
  frameCard: {
    width: FRAME_CARD_SIZE,
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  framePreviewRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  framePreviewCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  framePreviewLetter: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.accent,
  },
  frameName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginTop: 6,
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
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    marginTop: 2,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeLockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  themeName: {
    fontSize: 11,
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
