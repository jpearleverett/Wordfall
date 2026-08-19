import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../constants';
import { AmbientBackdrop } from './AmbientBackdrop';
import { useReduceMotion } from '../../hooks/useReduceMotion';

type BackdropVariant =
  | 'home'
  | 'library'
  | 'game'
  | 'collections'
  | 'profile'
  | 'shop'
  | 'leaderboard'
  | 'event'
  | 'mastery'
  | 'modes'
  | 'settings'
  | 'club';

interface ScreenScaffoldProps {
  /** Screen title, rendered in the display font with an accent glow. */
  title: string;
  /** Optional small-caps eyebrow rendered above the title (e.g. "SEASON 8"). */
  eyebrow?: string;
  /** Optional one-line subtitle under the title. */
  subtitle?: string;
  /** Accent color driving the title glow + header hairline. */
  accent?: string;
  /** AmbientBackdrop variant behind the screen. */
  backdrop?: BackdropVariant;
  /** Renders a glass back button and calls this on press. */
  onBack?: () => void;
  /** Right-aligned header slot (currency chips, action button…). */
  headerRight?: React.ReactNode;
  /**
   * When true (default) children render inside a vertical ScrollView with
   * standard content padding. Pass false for screens that manage their own
   * lists (FlatList/SectionList) — children then render in a plain flex view.
   */
  scroll?: boolean;
  /** Extra style for the scroll content container (padding overrides etc.). */
  contentStyle?: ViewStyle;
  children: React.ReactNode;
}

/**
 * ScreenScaffold — the shared shell for every non-Home screen. Owns the
 * pieces each screen used to hand-roll slightly differently (and the ones
 * most screens simply lacked): safe-area top inset instead of a hardcoded
 * paddingTop: 60, an AmbientBackdrop, a glass back button (several screens
 * shipped with NO back affordance at all), a chrome-styled title with an
 * accent hairline, and Home's entrance spring so every screen animates in
 * with the same motion signature.
 */
export default function ScreenScaffold({
  title,
  eyebrow,
  subtitle,
  accent = COLORS.accent,
  backdrop = 'settings',
  onBack,
  headerRight,
  scroll = true,
  contentStyle,
  children,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const enterAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enterAnim.setValue(1);
      return;
    }
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bodyStyle = {
    flex: 1,
    opacity: enterAnim,
    transform: [
      {
        translateY: enterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant={backdrop} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          <View style={styles.titleBlock}>
            {eyebrow != null && (
              <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
            )}
            <Text
              style={[
                styles.title,
                { textShadowColor: accent + '99' },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          <View style={styles.rightSlot}>{headerRight ?? <View style={styles.backSpacer} />}</View>
        </View>

        {/* Accent hairline under the header — fades out to both edges. */}
        <LinearGradient
          colors={['transparent', accent + '66', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.hairline}
        />
      </View>

      <Animated.View style={bodyStyle}>
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.noScrollBody, contentStyle]}>{children}</View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  backChevron: {
    color: COLORS.textPrimary,
    fontSize: 26,
    lineHeight: 30,
    marginTop: -3,
    fontFamily: FONTS.display,
  },
  backSpacer: {
    width: 40,
    height: 40,
  },
  pressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  eyebrow: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 2,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.textPrimary,
    letterSpacing: 3.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hairline: {
    height: 1.5,
    borderRadius: 1,
    marginTop: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 12,
  },
  noScrollBody: {
    flex: 1,
  },
});
