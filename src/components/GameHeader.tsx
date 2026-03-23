import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, MODE_CONFIGS } from '../constants';
import { GameMode } from '../types';

interface GameHeaderProps {
  level: number;
  score: number;
  combo: number;
  moves: number;
  hintsLeft: number;
  undosLeft: number;
  foundWords: number;
  totalWords: number;
  isDaily?: boolean;
  mode?: GameMode;
  maxMoves?: number;
  timeRemaining?: number;
  cascadeMultiplier?: number;
  onHint: () => void;
  onUndo: () => void;
  onBack: () => void;
}

function BookGlyph() {
  return (
    <View style={styles.bookGlyph}>
      <LinearGradient
        colors={['#9bdfff', '#42bfff', '#1273ce'] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.bookSpine} />
      <View style={styles.bookPageHighlight} />
      <View style={styles.bookPageShadow} />
    </View>
  );
}

function BackChevron() {
  return (
    <View style={styles.chevronWrap}>
      <View style={[styles.chevronStroke, styles.chevronTop]} />
      <View style={[styles.chevronStroke, styles.chevronBottom]} />
    </View>
  );
}

function HintGlyph() {
  return (
    <View style={styles.hintGlyph}>
      <View style={styles.hintCore} />
      <View style={styles.hintStem} />
      <View style={styles.hintSparkLeft} />
      <View style={styles.hintSparkRight} />
      <View style={styles.hintSparkTop} />
    </View>
  );
}

function UndoGlyph() {
  return (
    <View style={styles.undoGlyph}>
      <View style={styles.undoArrowHead} />
      <View style={styles.undoArc} />
      <View style={styles.undoTail} />
    </View>
  );
}

interface ActionModuleProps {
  disabled: boolean;
  countLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}

function ActionModule({ disabled, countLabel, onPress, children }: ActionModuleProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionModule, disabled && styles.actionDisabled, pressed && styles.btnPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={['rgba(88,116,164,0.95)', 'rgba(24,34,72,0.98)'] as [string, string]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFillObject, styles.actionModuleFill]}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'transparent'] as [string, string]}
        style={styles.actionModuleSheen}
      />
      {children}
      <View style={styles.cyanBadge}>
        <Text style={styles.cyanBadgeText}>{countLabel}</Text>
      </View>
    </Pressable>
  );
}

export function GameHeader({
  level,
  score,
  combo,
  moves,
  hintsLeft,
  undosLeft,
  foundWords,
  totalWords,
  isDaily,
  mode = 'classic',
  maxMoves = 0,
  timeRemaining = 0,
  cascadeMultiplier = 1,
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const modeConfig = MODE_CONFIGS[mode];
  const progress = totalWords > 0 ? foundWords / totalWords : 0;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  void combo;
  void moves;
  void isDaily;
  void maxMoves;
  void timeRemaining;
  void cascadeMultiplier;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.12, duration: 90, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [score, scoreAnim]);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(scanlineAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    ).start();
  }, [scanlineAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const scanlineTranslate = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 320],
  });

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 6) + 4 }]}>
      <View style={styles.topRow}>
        <Pressable style={({ pressed }) => [styles.backModule, pressed && styles.btnPressed]} onPress={onBack}>
          <LinearGradient
            colors={['#95a3b9', '#55637d', '#222c43'] as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.backBezel]}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.04)'] as [string, string]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.backInnerGlow}
          />
          <View style={styles.backCore}>
            <LinearGradient
              colors={['#1d2740', '#0a1226'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, styles.backCoreFill]}
            />
            <BackChevron />
          </View>
        </Pressable>

        <View style={styles.levelModule}>
          <LinearGradient
            colors={['rgba(66, 88, 138, 0.98)', 'rgba(17, 25, 58, 0.98)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.levelModuleFill]}
          />
          <View style={[styles.levelGlow, { backgroundColor: `${modeConfig.color}26` }]} />
          <View style={styles.levelIconWell}>
            <BookGlyph />
          </View>
          <View style={styles.levelCopy}>
            <Text style={styles.levelLabel}>Lv {level}</Text>
            <Text style={[styles.levelModeText, { color: modeConfig.color }]}>{modeConfig.name}</Text>
          </View>
          <View style={styles.levelDivider} />
          <View style={styles.levelProgressCopy}>
            <Text style={styles.levelProgressLabel}>FOUND</Text>
            <Text style={styles.levelProgressValue}>{foundWords}/{totalWords}</Text>
          </View>
        </View>

        <View style={styles.scoreModule}>
          <LinearGradient
            colors={['rgba(44, 63, 106, 0.94)', 'rgba(17, 26, 52, 0.98)'] as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.scoreModuleFill]}
          />
          <View style={styles.scorePedestal} />
          <View style={[styles.scoreHologram, { shadowColor: COLORS.gold, borderColor: 'rgba(255,215,0,0.3)' }]} />
          <Text style={styles.scoreCaption}>SCORE</Text>
          <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>{score.toLocaleString()}</Animated.Text>
        </View>

        <View style={styles.actionsStack}>
          {modeConfig.rules.allowHints && (
            <ActionModule disabled={hintsLeft <= 0} countLabel={String(Math.max(hintsLeft, 0))} onPress={onHint}>
              <HintGlyph />
            </ActionModule>
          )}

          {modeConfig.rules.allowUndo && (
            <ActionModule
              disabled={undosLeft <= 0 && !modeConfig.rules.unlimitedUndo}
              countLabel={modeConfig.rules.unlimitedUndo ? '∞' : String(Math.max(undosLeft, 0))}
              onPress={onUndo}
            >
              <UndoGlyph />
            </ActionModule>
          )}
        </View>
      </View>

      <View style={styles.scanlineWrap}>
        <View style={styles.scanlineTrack}>
          <View style={styles.scanlineRail} />
          <Animated.View style={[styles.scanlineFill, { width: progressWidth as any, backgroundColor: modeConfig.color }]} />
          <Animated.View
            style={[
              styles.scanlinePulse,
              {
                transform: [{ translateX: scanlineTranslate }],
                opacity: progress > 0 ? 0.95 : 0.35,
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', `${modeConfig.color}bb`, '#ffffff', `${modeConfig.color}bb`, 'transparent'] as [string, string, string, string, string]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.scanlineNode,
              {
                left: progressWidth as any,
                backgroundColor: modeConfig.color,
                shadowColor: modeConfig.color,
                opacity: progress > 0 ? 1 : 0.45,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  backModule: {
    width: 56,
    height: 56,
    borderRadius: 18,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  backBezel: {
    borderRadius: 18,
  },
  backInnerGlow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  backCore: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backCoreFill: {
    borderRadius: 15,
  },
  chevronWrap: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -2,
  },
  chevronStroke: {
    position: 'absolute',
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textPrimary,
    shadowColor: COLORS.accentLight,
    shadowOpacity: 0.45,
    shadowRadius: 4,
  },
  chevronTop: {
    transform: [{ rotate: '-45deg' }, { translateX: -2 }, { translateY: -4 }],
  },
  chevronBottom: {
    transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 4 }],
  },
  levelModule: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 212, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  levelModuleFill: {
    borderRadius: 28,
  },
  levelGlow: {
    position: 'absolute',
    width: 120,
    height: 80,
    borderRadius: 40,
    left: -18,
    top: -8,
  },
  levelIconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(5,14,34,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(155,223,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bookGlyph: {
    width: 20,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
    transform: [{ skewY: '-8deg' }],
  },
  bookSpine: {
    position: 'absolute',
    left: 3,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(10,25,60,0.55)',
  },
  bookPageHighlight: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
  },
  bookPageShadow: {
    position: 'absolute',
    right: 3,
    bottom: 2,
    width: 9,
    height: 7,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  levelCopy: {
    justifyContent: 'center',
    gap: 2,
  },
  levelLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
  },
  levelModeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  levelDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  levelProgressCopy: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  levelProgressLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
  levelProgressValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
  },
  scoreModule: {
    width: 108,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  scoreModuleFill: {
    borderRadius: 18,
  },
  scorePedestal: {
    position: 'absolute',
    bottom: 6,
    width: 72,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 203, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(17, 203, 255, 0.22)',
  },
  scoreHologram: {
    position: 'absolute',
    top: 10,
    width: 64,
    height: 26,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  scoreCaption: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 18,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 14,
    marginTop: 1,
  },
  actionsStack: {
    flexDirection: 'row',
    gap: 8,
  },
  actionModule: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(123,168,224,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  actionModuleFill: {
    borderRadius: 18,
  },
  actionModuleSheen: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: 18,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  cyanBadge: {
    position: 'absolute',
    top: -5,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#d9fbff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 8,
  },
  cyanBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: FONTS.display,
  },
  hintGlyph: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffe673',
    borderWidth: 1,
    borderColor: '#fff6b4',
    shadowColor: '#ffe673',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  hintStem: {
    position: 'absolute',
    bottom: 3,
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffc84a',
  },
  hintSparkLeft: {
    position: 'absolute',
    left: 3,
    top: 7,
    width: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
    transform: [{ rotate: '-34deg' }],
  },
  hintSparkRight: {
    position: 'absolute',
    right: 3,
    top: 7,
    width: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
    transform: [{ rotate: '34deg' }],
  },
  hintSparkTop: {
    position: 'absolute',
    top: 1,
    width: 2,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
  },
  undoGlyph: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoArrowHead: {
    position: 'absolute',
    left: 3,
    top: 8,
    width: 9,
    height: 9,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#a6f0ff',
    transform: [{ rotate: '45deg' }],
  },
  undoArc: {
    position: 'absolute',
    right: 3,
    top: 5,
    width: 14,
    height: 14,
    borderWidth: 3,
    borderColor: '#a6f0ff',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
  },
  undoTail: {
    position: 'absolute',
    left: 8,
    top: 7,
    width: 9,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#a6f0ff',
  },
  scanlineWrap: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  scanlineTrack: {
    height: 14,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scanlineRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(110,140,190,0.18)',
  },
  scanlineFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  scanlinePulse: {
    position: 'absolute',
    width: 110,
    height: 10,
    borderRadius: 999,
  },
  scanlineNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
