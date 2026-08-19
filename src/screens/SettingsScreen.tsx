import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  Pressable,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import PrimaryButton from '../components/common/PrimaryButton';
import { bentoPanel, bentoDividerColor, type BentoAccent } from '../styles/bentoPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useCommerce } from '../hooks/useCommerce';
import {
  useEconomyStore,
  selectIsAdFreeComputed,
  selectIsPremiumPassFlag,
} from '../stores/economyStore';
import { usePlayerActions } from '../stores/playerStore';
import {
  requestAccountDeletion,
  clearLocalUserData,
  isAccountDeletionConfigured,
} from '../services/accountDeletion';
import { analytics } from '../services/analytics';
import type { ColorblindMode } from '../contexts/SettingsContext';
import { COLORBLIND_MODE_LABELS } from '../services/colorblind';
import i18n, { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from '../i18n';

const COLORBLIND_MODES: ColorblindMode[] = [
  'off',
  'deuteranopia',
  'protanopia',
  'tritanopia',
];

const THEMES = [
  { id: 'dark', name: 'Dark', color: '#0a0e27' },
  { id: 'midnight', name: 'Midnight', color: '#0d1117' },
  { id: 'ocean', name: 'Ocean', color: '#0a1628' },
  { id: 'forest', name: 'Forest', color: '#0a1a0f' },
  { id: 'sunset', name: 'Sunset', color: '#1a0a0a' },
];

const PRIVACY_POLICY_URL = 'https://wordfallgame.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://wordfallgame.app/terms';
const SUPPORT_EMAIL = 'info@iridescent-games.com';
const MANAGE_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.iridescent_games.wordfall';

async function openUrlSafe(url: string, fallbackTitle: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to alert
  }
  Alert.alert(fallbackTitle, url);
}

/** #rrggbb + alpha suffix; non-hex colors pass through unchanged. */
function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color + alphaHex : color;
}

/**
 * Quiet accent glow — half the strength of SHADOWS.glow. The round-2 art
 * review flagged this screen for "cyan glow overload": every row, chip, and
 * badge carried a full-strength halo, so nothing read as emphasized. Selected
 * / active states now use this; only danger surfaces keep a stronger accent.
 */
const softGlow = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 4,
});

// ─── Drawn glyph kit — layered Views/gradients, no emoji (same technique as
// ModesScreen's ModeGlyph family / LeaderboardScreen's GlyphMedallion). ─────

type GlyphProps = { size?: number; accent?: string };

/**
 * DrawnMedallion — IconMedallion's layered-gem shell, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function DrawnMedallion({
  size = 34,
  accent = COLORS.purple,
  style,
  children,
}: {
  size?: number;
  accent?: string;
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
          borderColor: accent + '73',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
          shadowColor: accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.28,
          shadowRadius: size * 0.11,
          elevation: 3,
        },
        style ?? null,
      ]}
    >
      <LinearGradient
        colors={[accent + '3D', 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
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

/** Drawn speaker — driver box + flared cone + clipped-ring wave arcs (SFX). */
function SpeakerGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const arc = (d: number, right: number, opacity: number) => (
    <View
      key={d}
      style={{
        position: 'absolute',
        right,
        top: (size - d) / 2,
        width: d / 2,
        height: d,
        overflow: 'hidden',
        opacity,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: -d / 2,
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: size * 0.08,
          borderColor: accent,
        }}
      />
    </View>
  );
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.02,
          top: size * 0.32,
          width: size * 0.18,
          height: size * 0.36,
          borderRadius: size * 0.05,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.16,
          top: size * 0.14,
          width: 0,
          height: 0,
          borderTopWidth: size * 0.36,
          borderBottomWidth: size * 0.36,
          borderRightWidth: size * 0.3,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: accent,
        }}
      />
      {arc(size * 0.52, size * 0.24, 0.9)}
      {arc(size * 0.84, size * 0.04, 0.5)}
    </View>
  );
}

/** Drawn music note — gradient disc + stem + flag (Music). */
function NoteGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const head = size * 0.42;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.1,
          bottom: size * 0.02,
          width: head,
          height: head * 0.82,
          borderRadius: head / 2,
          overflow: 'hidden',
          transform: [{ rotate: '-16deg' }],
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: size * 0.46,
          top: size * 0.08,
          width: size * 0.1,
          height: size * 0.62,
          borderRadius: size * 0.05,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.5,
          top: size * 0.05,
          width: size * 0.32,
          height: size * 0.17,
          borderTopRightRadius: size * 0.17,
          borderBottomLeftRadius: size * 0.1,
          backgroundColor: accent + 'CC',
          transform: [{ rotate: '16deg' }],
        }}
      />
    </View>
  );
}

/** Drawn 8-point star burst — two crossed gradient squares + hot core (Ceremony). */
function StarBurstGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const sq = size * 0.68;
  const square = {
    position: 'absolute' as const,
    width: sq,
    height: sq,
    borderRadius: sq * 0.18,
    overflow: 'hidden' as const,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[square, { transform: [{ rotate: '45deg' }] }]}>
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={square}>
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: sq * 0.34,
          height: sq * 0.34,
          borderRadius: sq * 0.17,
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />
    </View>
  );
}

/**
 * Volumes are stored as 0–1 fractions (see SettingsContext DEFAULT_SETTINGS:
 * sfxVolume 0.8). The old UI printed the raw fraction with a "%" suffix
 * ("0.8%") and stepped it ±10 in 0–100 space, corrupting the stored value.
 * Display + stepping now happen in percent; storage keeps fraction semantics.
 * Legacy corrupted values > 1 are read as percent so they self-heal on the
 * next write.
 */
const toPercent = (raw: number): number =>
  Math.round(Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw)));

/** Drawn phone with vibration bars — Haptics. */
function PhoneVibeGlyph({ size = 24, accent = COLORS.pink }: GlyphProps) {
  const bar = (left: number, rot: string) => (
    <View
      key={rot}
      style={{
        position: 'absolute',
        left,
        top: size * 0.3,
        width: size * 0.07,
        height: size * 0.4,
        borderRadius: size * 0.04,
        backgroundColor: accent + 'B3',
        transform: [{ rotate: rot }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.44,
          height: size * 0.78,
          borderRadius: size * 0.1,
          borderWidth: size * 0.07,
          borderColor: accent,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.05,
        }}
      >
        <View
          style={{
            width: size * 0.12,
            height: size * 0.05,
            borderRadius: size * 0.03,
            backgroundColor: accent,
          }}
        />
      </View>
      {bar(size * 0.02, '-14deg')}
      {bar(size * 0.91, '14deg')}
    </View>
  );
}

/** Drawn bell — gradient dome + lip bar + clapper (Notifications). */
function BellGlyph({ size = 24, accent = COLORS.pink }: GlyphProps) {
  const w = size * 0.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: size * 0.5,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          width: size * 0.82,
          height: size * 0.09,
          borderRadius: size * 0.05,
          backgroundColor: accent,
          marginTop: size * 0.02,
        }}
      />
      <View
        style={{
          width: size * 0.14,
          height: size * 0.12,
          borderBottomLeftRadius: size * 0.07,
          borderBottomRightRadius: size * 0.07,
          backgroundColor: accent + 'CC',
          marginTop: size * 0.02,
        }}
      />
    </View>
  );
}

/** Drawn eye — almond outline + iris + highlight (Colorblind mode). */
function EyeGlyph({ size = 24, accent = COLORS.purple }: GlyphProps) {
  const d = size * 0.94;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: d,
          height: d * 0.6,
          borderRadius: d * 0.3,
          borderWidth: size * 0.07,
          borderColor: accent,
        }}
      />
      <View
        style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.1,
          height: size * 0.1,
          borderRadius: size * 0.05,
          backgroundColor: 'rgba(255,255,255,0.85)',
          transform: [{ translateX: size * 0.04 }, { translateY: -size * 0.04 }],
        }}
      />
    </View>
  );
}

/** Drawn speech bubble — gradient bubble + tail + dots (Language). */
function SpeechBubbleGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const dot = size * 0.09;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.12,
          left: size * 0.2,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.04,
          backgroundColor: accent + 'B3',
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.02,
          right: size * 0.02,
          height: size * 0.62,
          borderRadius: size * 0.2,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: dot * 0.7,
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: 'rgba(8,2,22,0.8)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Drawn person — gradient head + shoulders (Account). */
function PersonGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  const head = size * 0.36;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          width: head,
          height: head,
          borderRadius: head / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.36,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '73']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn door with knob — Sign out. */
function DoorGlyph({ size = 24, accent = COLORS.coral }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.58,
          height: size * 0.88,
          borderRadius: size * 0.09,
          borderWidth: size * 0.07,
          borderColor: accent,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            alignSelf: 'flex-end',
            marginRight: size * 0.07,
            width: size * 0.1,
            height: size * 0.1,
            borderRadius: size * 0.05,
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}

/** Drawn price tag — rotated gradient square + punch hole (Restore purchases). */
function TagGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  const d = size * 0.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d * 0.18,
          overflow: 'hidden',
          transform: [{ rotate: '45deg' }],
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: d * 0.12,
            left: d * 0.12,
            width: d * 0.16,
            height: d * 0.16,
            borderRadius: d * 0.08,
            backgroundColor: 'rgba(8,2,22,0.8)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn payment card — gradient rect + mag stripe (Manage subscription). */
function CardGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.92, height: size * 0.62, borderRadius: size * 0.1, overflow: 'hidden' }}>
        <LinearGradient
          colors={[accent, accent + '80']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.12,
            left: 0,
            right: 0,
            height: size * 0.11,
            backgroundColor: 'rgba(8,2,22,0.75)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: size * 0.08,
            left: size * 0.08,
            width: size * 0.3,
            height: size * 0.07,
            borderRadius: size * 0.035,
            backgroundColor: 'rgba(255,255,255,0.6)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn shield — tapered gradient crest (Ad removal / Spending limit). */
function ShieldGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  const w = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: size * 0.84,
          borderTopLeftRadius: size * 0.1,
          borderTopRightRadius: size * 0.1,
          borderBottomLeftRadius: w / 2,
          borderBottomRightRadius: w / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '73']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: w / 2,
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn crown — three spikes + gradient band (Premium Pass). */
function CrownGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  const spike = (left: number, h: number) => (
    <View
      key={left}
      style={{
        position: 'absolute',
        bottom: size * 0.3,
        left,
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.12,
        borderRightWidth: size * 0.12,
        borderBottomWidth: h,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: accent,
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {spike(size * 0.02, size * 0.34)}
      {spike(size * 0.38, size * 0.46)}
      {spike(size * 0.74, size * 0.34)}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.12,
          left: size * 0.02,
          right: size * 0.02,
          height: size * 0.2,
          borderRadius: size * 0.05,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[COLORS.goldLight, accent]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn coin — gold gradient disc + inner ring (Monthly limit). */
function CoinGlyph({ size = 24 }: GlyphProps) {
  const d = size * 0.82;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[COLORS.goldLight, COLORS.gold]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: d * 0.6,
            height: d * 0.6,
            borderRadius: d * 0.3,
            borderWidth: size * 0.06,
            borderColor: 'rgba(8,2,22,0.5)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn padlock — ring shackle + gradient body + keyhole (Purchase PIN). */
function LockGlyph({ size = 24, accent = COLORS.purple }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.42,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderWidth: size * 0.08,
          borderBottomWidth: 0,
          borderColor: accent,
          marginTop: size * 0.02,
        }}
      />
      <View
        style={{
          width: size * 0.74,
          height: size * 0.5,
          borderRadius: size * 0.12,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -size * 0.04,
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: size * 0.1,
            height: size * 0.2,
            borderRadius: size * 0.05,
            backgroundColor: 'rgba(8,2,22,0.8)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn bar chart — three gradient columns (Analytics). */
function BarsGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const bar = (h: number, colors: [string, string], key: number) => (
    <View key={key} style={{ width: size * 0.22, height: size * h, borderRadius: size * 0.05, overflow: 'hidden' }}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: size * 0.08,
      }}
    >
      {bar(0.45, [accent + 'CC', accent + '66'], 0)}
      {bar(0.9, [accent, accent + '80'], 1)}
      {bar(0.65, [accent + 'E6', accent + '73'], 2)}
    </View>
  );
}

/** Drawn target — concentric rings + bullseye dot (Personalized ads). */
function TargetGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const ring = (d: number, t: number) => (
    <View
      key={d}
      style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: t, borderColor: accent }}
    />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ring(size, size * 0.07)}
      {ring(size * 0.62, size * 0.06)}
      <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: accent }} />
    </View>
  );
}

/** Drawn info ring — circle outline + dot + bar (Version). */
function InfoGlyph({ size = 24, accent = COLORS.purple }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size * 0.08,
          borderColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.2,
          width: size * 0.11,
          height: size * 0.11,
          borderRadius: size * 0.06,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.42,
          width: size * 0.11,
          height: size * 0.32,
          borderRadius: size * 0.05,
          backgroundColor: accent,
        }}
      />
    </View>
  );
}

/** Drawn document — gradient page + text lines (Privacy / Terms). */
function DocGlyph({ size = 24, accent = COLORS.purple }: GlyphProps) {
  const line = (top: number, w: number) => (
    <View
      key={top}
      style={{
        position: 'absolute',
        top,
        left: size * 0.12,
        width: w,
        height: size * 0.07,
        borderRadius: size * 0.035,
        backgroundColor: 'rgba(8,2,22,0.65)',
      }}
    />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.66, height: size * 0.88, borderRadius: size * 0.08, overflow: 'hidden' }}>
        <LinearGradient
          colors={[accent + 'E6', accent + '80']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {line(size * 0.16, size * 0.42)}
        {line(size * 0.34, size * 0.42)}
        {line(size * 0.52, size * 0.28)}
      </View>
    </View>
  );
}

/** Drawn envelope — gradient rect + rotated flap (Contact support). */
function EnvelopeGlyph({ size = 24, accent = COLORS.purple }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.9, height: size * 0.62, borderRadius: size * 0.09, overflow: 'hidden' }}>
        <LinearGradient
          colors={[accent, accent + '80']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: -size * 0.28,
            alignSelf: 'center',
            width: size * 0.56,
            height: size * 0.56,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(8,2,22,0.35)',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
}

/** Glass bento card shell with accent-tinted border, glow, and surface gradient. */
const Panel: React.FC<{ accent: BentoAccent; style?: ViewStyle; children: React.ReactNode }> = ({
  accent,
  style,
  children,
}) => (
  <View style={[bentoPanel(accent, { padding: 0 }), styles.panelClip, styles.panelGlowTrim, style]}>
    <LinearGradient
      colors={[...GRADIENTS.surfaceCard]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    />
    {children}
  </View>
);

const Divider: React.FC<{ accent: BentoAccent }> = ({ accent }) => (
  <View style={[styles.divider, { backgroundColor: bentoDividerColor(accent) }]} />
);

/** Circular glass +/- button with an accent glow ring. */
const StepButton: React.FC<{
  glyph: string;
  accent: string;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ glyph, accent, onPress, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={10}
    style={({ pressed }) => [
      styles.stepBtn,
      { borderColor: withAlpha(accent, '66'), shadowColor: accent },
      pressed && styles.stepBtnPressed,
    ]}
  >
    <LinearGradient
      colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
    <Text style={styles.stepBtnText}>{glyph}</Text>
  </Pressable>
);

interface SettingsScreenProps {
  settings?: any;
  onUpdateSetting?: (key: string, value: any) => void;
  onResetProgress?: () => void;
  onSignOut?: () => void;
  /** Injected by React Navigation (both stacks mount this screen directly). */
  navigation?: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings: settingsProp,
  onUpdateSetting: onUpdateSettingProp,
  onResetProgress: onResetProgressProp,
  onSignOut: onSignOutProp,
  navigation,
}) => {
  const { t } = useTranslation();
  const contextSettings = useSettings();
  const isAdFreeComputed = useEconomyStore(selectIsAdFreeComputed);
  const isPremiumPassFlag = useEconomyStore(selectIsPremiumPassFlag);
  const { signOut, isAnonymous, linkedEmail, canLinkGoogle, linkGoogle } = useAuth();
  const { restorePurchases } = useCommerce();
  const playerActions = usePlayerActions();

  const settings = settingsProp ?? contextSettings;
  const onUpdateSetting = onUpdateSettingProp ?? ((key: string, value: any) => contextSettings.updateSetting(key as any, value));
  // Default to a REAL reset. Both navigator registrations mount this screen
  // with no props (`component={SettingsScreen}`), so the old `() => {}`
  // default made "Reset Local Data" a confirmed no-op: the player read the
  // warning, tapped the destructive button, and nothing happened. A reset
  // control that silently does nothing is worse than none — it burns trust
  // in every other control on the screen.
  const onResetProgress =
    onResetProgressProp ??
    (() => {
      playerActions.updateProgress({
        currentLevel: 1,
        highestLevel: 1,
        totalScore: 0,
        puzzlesSolved: 0,
        perfectSolves: 0,
        starsByLevel: {},
        totalStars: 0,
      });
    });
  const onSignOut = onSignOutProp ?? signOut;

  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRestorePurchases = async () => {
    if (restoring) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'restore' });
    setRestoring(true);
    try {
      const { results, restoredCount } = await restorePurchases();
      // restorePurchases() resolves on every path; failed attempts surface as
      // a row with productId='restore_failed' (see iap.ts contract comment).
      const failureRow = results.find((r) => r.productId === 'restore_failed' && !r.success);
      if (failureRow) {
        Alert.alert('Restore Failed', failureRow.error ?? 'Could not restore purchases. Please try again.');
      } else if (results.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore on this account.');
      } else {
        Alert.alert(
          'Purchases Restored',
          t('common.purchasesRestored', { count: restoredCount }),
        );
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleSignIn = async () => {
    if (signingIn) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'link_google' });
    if (!canLinkGoogle) {
      Alert.alert(
        'Sign-In Unavailable',
        'Google Sign-In is not available in this build. Please update to the latest version of Wordfall.',
      );
      return;
    }
    setSigningIn(true);
    try {
      const result = await linkGoogle();
      if (!result.ok) {
        if (result.code !== 'CANCELLED') {
          Alert.alert('Sign-In Failed', result.error);
        }
        return;
      }
      await Promise.resolve(onUpdateSetting('isSignedIn', true));
      Alert.alert(
        'Account Linked',
        result.email
          ? `Signed in as ${result.email}. Your progress is now backed up to the cloud.`
          : 'Signed in. Your progress is now backed up to the cloud.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await Promise.resolve(onSignOut());
    } finally {
      setSigningOut(false);
    }
  };

  const sfxVolume = settings?.sfxVolume ?? 0.8;
  const musicVolume = settings?.musicVolume ?? 0.5;
  const ceremonyVolume = settings?.ceremonyVolume ?? 0.8;
  const hapticsEnabled = settings?.hapticsEnabled ?? settings?.haptics ?? true;
  const notificationsEnabled = settings?.notificationsEnabled ?? settings?.notifications ?? true;
  const selectedTheme = settings?.theme ?? 'dark';
  const colorblindMode: ColorblindMode = settings?.colorblindMode ?? 'off';
  const isSignedIn = settings?.isSignedIn ?? false;
  const adsRemoved = isAdFreeComputed ?? false;
  const premiumPass = isPremiumPassFlag ?? false;
  const appVersion = settings?.version ?? '1.0.0';

  // Steps in whole percent, stores the context's native 0–1 fraction.
  const handleVolumeChange = (key: string, rawValue: number, deltaPct: number) => {
    const pct = Math.max(0, Math.min(100, toPercent(rawValue) + deltaPct));
    onUpdateSetting(key, pct / 100);
  };

  const performAccountDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await requestAccountDeletion();
      if (!result.ok) {
        Alert.alert(
          'Deletion Failed',
          result.error ??
            'We could not complete the deletion. Please contact support so we can finish it manually.',
        );
        return;
      }
      await clearLocalUserData();
      try {
        await signOut();
      } catch {
        // signOut errors are non-fatal — auth state will settle on next launch
      }
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been deleted. We are sorry to see you go.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleManageSubscription = async () => {
    void analytics.logEvent('settings_account_row_tapped', { action: 'manage_subscription' });
    await openUrlSafe(MANAGE_SUBSCRIPTIONS_URL, 'Manage Subscription');
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    void analytics.logEvent('settings_account_row_tapped', { action: 'delete_account' });
    if (!isAccountDeletionConfigured()) {
      Alert.alert(
        'Unavailable',
        `Account deletion is temporarily unavailable from the app. Please email ${SUPPORT_EMAIL} and we will delete your account within 30 days.`,
      );
      return;
    }
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your profile, progress, club memberships, and friends list. Purchase records are retained in anonymized form for tax and fraud auditing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are You Absolutely Sure?',
              'This cannot be undone. Any unspent gems, purchased VIP time, and tournament progress will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => void performAccountDeletion(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const confirmResetProgress = () => {
    Alert.alert(
      'Reset Local Data',
      'This clears on-device progress only. Your account, purchases, and cloud-synced stats stay intact. Use "Delete Account & Data" below if you want full erasure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetProgress },
      ],
    );
  };

  // One compact line per channel: icon well + short label, then −[bar]+ with
  // the steppers paired tight on the bar ends (they are the ONLY input — the
  // bar itself is display-only), then the % readout in a quiet numeric chip.
  const renderVolumeControl = (
    label: string,
    displayLabel: string,
    settingKey: string,
    rawValue: number,
    glyph: React.ReactNode,
  ) => {
    const pct = toPercent(rawValue);
    return (
      <View
        style={styles.volumeRow}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}: ${pct} percent`}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.rowLeft, styles.volumeLabelBlock]}>
          <DrawnMedallion size={28} accent={COLORS.cyan}>{glyph}</DrawnMedallion>
          <Text style={styles.settingLabel} numberOfLines={1}>{displayLabel}</Text>
        </View>
        <View style={styles.volumeControls}>
          <StepButton
            glyph={'−'}
            accent={COLORS.cyan}
            onPress={() => handleVolumeChange(settingKey, rawValue, -10)}
            accessibilityLabel={`Decrease ${label}`}
          />
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${pct}%` }]} />
            <View style={[styles.volumeThumb, { left: `${pct}%` }]} />
          </View>
          <StepButton
            glyph="+"
            accent={COLORS.cyan}
            onPress={() => handleVolumeChange(settingKey, rawValue, 10)}
            accessibilityLabel={`Increase ${label}`}
          />
        </View>
        <View style={styles.volumePctChip}>
          <Text style={styles.volumePctText}>{pct}%</Text>
        </View>
      </View>
    );
  };

  const renderToggle = (
    label: string,
    value: boolean,
    settingKey: string,
    glyph: React.ReactNode,
    accent: string,
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <DrawnMedallion size={28} accent={accent}>{glyph}</DrawnMedallion>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Pressable
        onPress={() => onUpdateSetting(settingKey, !value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.toggle,
          value && styles.toggleOn,
          pressed && styles.togglePressed,
        ]}
      >
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </Pressable>
    </View>
  );

  const renderChip = (opts: {
    key: string;
    label: string;
    selected: boolean;
    onPress: () => void;
    accent: string;
    a11yLabel: string;
    swatch?: string;
  }) => (
    <Pressable
      key={opts.key}
      onPress={opts.onPress}
      accessibilityRole="radio"
      accessibilityLabel={opts.a11yLabel}
      accessibilityState={{ selected: opts.selected }}
      style={({ pressed }) => [
        styles.chip,
        opts.selected && {
          borderColor: opts.accent,
          backgroundColor: withAlpha(opts.accent, '26'),
          ...softGlow(opts.accent),
        },
        pressed && styles.chipPressed,
      ]}
    >
      {opts.swatch != null && (
        <View style={[styles.chipSwatch, { backgroundColor: opts.swatch }]} />
      )}
      <Text style={[styles.chipText, opts.selected && styles.chipTextSelected]}>
        {opts.label}
      </Text>
      {opts.selected && (
        <Text style={[styles.chipCheck, { color: opts.accent }]}>{'✓'}</Text>
      )}
    </Pressable>
  );

  return (
    <ScreenScaffold
      title={t('settings.title').toUpperCase()}
      accent={COLORS.accent}
      backdrop="settings"
      onBack={navigation ? () => navigation.goBack() : undefined}
    >
      {/* Hero status strip — a compact glass vignette so the screen opens with
          player identity instead of a bare utility list. */}
      <View
        style={styles.heroStrip}
        accessibilityRole="text"
        accessibilityLabel={`${
          linkedEmail ? `Signed in as ${linkedEmail}` : isSignedIn ? 'Signed in' : 'Guest player'
        }. Ad removal ${adsRemoved ? 'active' : 'inactive'}. Premium pass ${
          premiumPass ? 'active' : 'inactive'
        }`}
      >
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <LinearGradient
          colors={[withAlpha(COLORS.accent, '29'), 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <DrawnMedallion size={44} accent={isSignedIn ? COLORS.gold : COLORS.accent}>
          <PersonGlyph size={24} accent={isSignedIn ? COLORS.gold : COLORS.accent} />
        </DrawnMedallion>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {linkedEmail ?? (isSignedIn ? 'Signed In' : 'Guest Player')}
          </Text>
          <Text style={styles.heroSub} numberOfLines={1}>
            {isSignedIn ? 'Cloud backup active' : 'Progress stored on this device'}
          </Text>
        </View>
        <View style={styles.heroBadges}>
          <View style={[styles.heroPill, adsRemoved ? styles.heroPillOn : styles.heroPillOff]}>
            <Text style={[styles.heroPillText, adsRemoved && styles.heroPillTextOn]}>AD-FREE</Text>
          </View>
          <View style={[styles.heroPill, premiumPass ? styles.heroPillGold : styles.heroPillOff]}>
            <Text style={[styles.heroPillText, premiumPass && styles.heroPillTextGold]}>PASS</Text>
          </View>
        </View>
      </View>

      {/* Sound */}
      <SectionHeader label="SOUND" accent={COLORS.cyan} />
      <Panel accent="cyan">
        {renderVolumeControl('SFX Volume', 'SFX', 'sfxVolume', sfxVolume, <SpeakerGlyph size={16} accent={COLORS.cyan} />)}
        <Divider accent="cyan" />
        {renderVolumeControl('Music Volume', 'Music', 'musicVolume', musicVolume, <NoteGlyph size={16} accent={COLORS.cyan} />)}
        <Divider accent="cyan" />
        {renderVolumeControl('Ceremony Volume', 'Ceremony', 'ceremonyVolume', ceremonyVolume, <StarBurstGlyph size={16} accent={COLORS.cyan} />)}
      </Panel>

      {/* Gameplay */}
      <SectionHeader label="GAMEPLAY" accent={COLORS.pink} />
      <Panel accent="pink">
        {renderToggle('Haptics', hapticsEnabled, 'hapticsEnabled', <PhoneVibeGlyph size={16} accent={COLORS.pink} />, COLORS.pink)}
        <Divider accent="pink" />
        {renderToggle('Notifications', notificationsEnabled, 'notificationsEnabled', <BellGlyph size={16} accent={COLORS.pink} />, COLORS.pink)}
      </Panel>

      {/* Accessibility */}
      <SectionHeader label={t('settings.accessibility').toUpperCase()} accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.panelIntro}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.purple}>
              <EyeGlyph size={16} accent={COLORS.purple} />
            </DrawnMedallion>
            <Text style={styles.settingLabel}>Colorblind Mode</Text>
          </View>
          <Text style={styles.panelIntroText}>
            Swaps letter-cell, selection, and valid-word colors so they remain distinct.
          </Text>
        </View>
        <View style={styles.chipWrap}>
          {COLORBLIND_MODES.map((mode) =>
            renderChip({
              key: mode,
              label: COLORBLIND_MODE_LABELS[mode],
              selected: colorblindMode === mode,
              onPress: () => onUpdateSetting('colorblindMode', mode),
              accent: COLORS.purple,
              a11yLabel: `Colorblind mode: ${COLORBLIND_MODE_LABELS[mode]}`,
            }),
          )}
        </View>
      </Panel>

      {/* Language */}
      <SectionHeader label={t('settings.language').toUpperCase()} accent={COLORS.cyan} />
      <Panel accent="cyan">
        <View style={styles.panelIntro}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.cyan}>
              <SpeechBubbleGlyph size={16} accent={COLORS.cyan} />
            </DrawnMedallion>
            <Text style={styles.panelIntroText}>UI language. Puzzles remain English.</Text>
          </View>
        </View>
        <View style={styles.chipWrap}>
          {SUPPORTED_LOCALES.map((loc) =>
            renderChip({
              key: loc,
              label: LOCALE_LABELS[loc as SupportedLocale],
              selected: (settings?.language ?? 'en') === loc,
              onPress: () => {
                onUpdateSetting('language', loc);
                void i18n.changeLanguage(loc);
              },
              accent: COLORS.cyan,
              a11yLabel: `Language: ${LOCALE_LABELS[loc as SupportedLocale]}`,
            }),
          )}
        </View>
      </Panel>

      {/* Theme */}
      <SectionHeader label="THEME" accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.chipWrap}>
          {THEMES.map((theme) =>
            renderChip({
              key: theme.id,
              label: theme.name,
              selected: selectedTheme === theme.id,
              onPress: () => onUpdateSetting('theme', theme.id),
              accent: COLORS.purple,
              a11yLabel: `${theme.name} theme`,
              swatch: theme.color,
            }),
          )}
        </View>
      </Panel>

      {/* Account */}
      <SectionHeader label={t('settings.account').toUpperCase()} accent={COLORS.gold} />
      <Panel accent="gold">
        {isSignedIn ? (
          <>
            <View
              style={styles.actionRow}
              accessibilityRole="text"
              accessibilityLabel={
                linkedEmail
                  ? `Signed in as ${linkedEmail}`
                  : isAnonymous
                    ? 'Guest account — progress is stored on this device only'
                    : 'Signed in'
              }
            >
              <DrawnMedallion size={28} accent={COLORS.gold}>
                <PersonGlyph size={16} accent={COLORS.gold} />
              </DrawnMedallion>
              <Text style={styles.settingLabel}>
                {linkedEmail ? 'Google Account' : 'Account'}
              </Text>
              <Text
                style={[styles.rowValueText, { flex: 1, textAlign: 'right' }]}
                numberOfLines={1}
              >
                {linkedEmail
                  ? linkedEmail
                  : isAnonymous
                    ? 'Guest (not backed up)'
                    : 'Signed in'}
              </Text>
            </View>
            <Divider accent="gold" />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={() => {
                // Defer the confirmation prompt then run the async handler
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', onPress: () => void handleSignOut() },
                  ],
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              accessibilityState={{ busy: signingOut }}
              disabled={signingOut}
            >
              <DrawnMedallion size={28} accent={COLORS.coral}>
                <DoorGlyph size={16} accent={COLORS.coral} />
              </DrawnMedallion>
              <Text style={[styles.settingLabel, { color: COLORS.coral, flex: 1 }]}>
                Sign Out
              </Text>
              {signingOut ? (
                <ActivityIndicator size="small" color={COLORS.coral} />
              ) : (
                <Text style={[styles.chevron, { color: COLORS.coral }]}>{'›'}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
            onPress={() => void handleSignIn()}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ busy: signingIn }}
            disabled={signingIn}
          >
            <DrawnMedallion size={28} accent={COLORS.accent}>
              <PersonGlyph size={16} accent={COLORS.accent} />
            </DrawnMedallion>
            <Text style={[styles.settingLabel, { color: COLORS.accent, flex: 1 }]}>
              {signingIn ? 'Signing in…' : 'Sign In with Google'}
            </Text>
            {signingIn ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Text style={[styles.chevron, { color: COLORS.accent }]}>{'›'}</Text>
            )}
          </Pressable>
        )}

        <Divider accent="gold" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          onPress={() => void handleRestorePurchases()}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
          accessibilityHint="Re-applies purchases made on this account. Use this after reinstalling or switching devices."
          accessibilityState={{ busy: restoring }}
          disabled={restoring}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <DrawnMedallion size={28} accent={COLORS.gold}>
            <TagGlyph size={16} accent={COLORS.gold} />
          </DrawnMedallion>
          <Text style={[styles.settingLabel, { color: COLORS.accent, flex: 1 }]}>
            {restoring ? `${t('common.loading')}` : t('settings.restorePurchases')}
          </Text>
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={[styles.chevron, { color: COLORS.accent }]}>{'›'}</Text>
          )}
        </Pressable>

        {Platform.OS === 'android' ? (
          <>
            <Divider accent="gold" />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={() => void handleManageSubscription()}
              accessibilityRole="button"
              accessibilityLabel="Manage subscription"
              accessibilityHint="Opens the Google Play subscription management page."
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <DrawnMedallion size={28} accent={COLORS.gold}>
                <CardGlyph size={16} accent={COLORS.gold} />
              </DrawnMedallion>
              <Text style={[styles.settingLabel, { flex: 1 }]}>Manage Subscription</Text>
              <Text style={styles.chevron}>{'›'}</Text>
            </Pressable>
          </>
        ) : null}

        <Divider accent="gold" />
        <View style={styles.panelFooter}>
          <PrimaryButton
            label={deleting ? `${t('common.loading')}` : t('settings.deleteAccount')}
            onPress={confirmDeleteAccount}
            variant="danger"
            size="medium"
            fullWidth
            disabled={deleting}
            accessibilityLabel="Delete account and data. Permanently erases your cloud profile"
          />
        </View>
      </Panel>
      {/* Purchases */}
      <SectionHeader label="PURCHASES" accent={COLORS.gold} />
      <Panel accent="gold">
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.gold}>
              <ShieldGlyph size={16} accent={COLORS.gold} />
            </DrawnMedallion>
            <Text style={styles.settingLabel}>Ad Removal</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              adsRemoved ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                adsRemoved ? styles.statusTextActive : styles.statusTextInactive,
              ]}
            >
              {adsRemoved ? 'Active' : 'Not Purchased'}
            </Text>
          </View>
        </View>
        <Divider accent="gold" />
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.gold}>
              <CrownGlyph size={16} accent={COLORS.gold} />
            </DrawnMedallion>
            <Text style={styles.settingLabel}>Premium Pass</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              premiumPass ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                premiumPass ? styles.statusTextActive : styles.statusTextInactive,
              ]}
            >
              {premiumPass ? 'Active' : 'Not Purchased'}
            </Text>
          </View>
        </View>
      </Panel>

      {/* Parental Controls */}
      <SectionHeader label="PARENTAL CONTROLS" accent={COLORS.purple} />
      <Panel accent="purple">
        {renderToggle('Spending Limit', settings?.spendingLimitEnabled ?? false, 'spendingLimitEnabled', <ShieldGlyph size={16} accent={COLORS.purple} />, COLORS.purple)}
        <Divider accent="purple" />
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.purple}>
              <CoinGlyph size={16} />
            </DrawnMedallion>
            <Text style={styles.settingLabel}>Monthly Limit</Text>
          </View>
          <View style={styles.stepperGroup}>
            <StepButton
              glyph={'−'}
              accent={COLORS.purple}
              onPress={() => onUpdateSetting('monthlySpendingLimit', Math.max(0, (settings?.monthlySpendingLimit ?? 25) - 5))}
              accessibilityLabel="Decrease monthly spending limit"
            />
            <Text style={styles.stepperValue}>
              ${settings?.monthlySpendingLimit ?? 25}
            </Text>
            <StepButton
              glyph="+"
              accent={COLORS.purple}
              onPress={() => onUpdateSetting('monthlySpendingLimit', Math.min(500, (settings?.monthlySpendingLimit ?? 25) + 5))}
              accessibilityLabel="Increase monthly spending limit"
            />
          </View>
        </View>
        <Divider accent="purple" />
        {renderToggle('Require PIN for Purchases', settings?.requirePurchasePin ?? false, 'requirePurchasePin', <LockGlyph size={16} accent={COLORS.purple} />, COLORS.purple)}
      </Panel>

      {/* Privacy */}
      <SectionHeader label="PRIVACY" accent={COLORS.cyan} />
      <Panel accent="cyan">
        {renderToggle(
          'Analytics',
          settings?.analyticsEnabled ?? true,
          'analyticsEnabled',
          <BarsGlyph size={16} accent={COLORS.cyan} />,
          COLORS.cyan,
        )}
        <Divider accent="cyan" />
        {renderToggle(
          'Personalized Ads',
          settings?.personalizedAdsEnabled ?? true,
          'personalizedAdsEnabled',
          <TargetGlyph size={16} accent={COLORS.cyan} />,
          COLORS.cyan,
        )}
      </Panel>

      {/* About */}
      <SectionHeader label="ABOUT" accent={COLORS.purple} />
      <Panel accent="purple">
        <View style={styles.settingRow}>
          <View style={styles.rowLeft}>
            <DrawnMedallion size={28} accent={COLORS.purple}>
              <InfoGlyph size={16} accent={COLORS.purple} />
            </DrawnMedallion>
            <Text style={styles.settingLabel}>Version</Text>
          </View>
          <Text style={styles.rowValueText}>{appVersion}</Text>
        </View>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
          onPress={() => openUrlSafe(PRIVACY_POLICY_URL, 'Privacy Policy')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <DrawnMedallion size={28} accent={COLORS.purple}>
            <DocGlyph size={16} accent={COLORS.purple} />
          </DrawnMedallion>
          <Text style={[styles.settingLabel, { flex: 1 }]}>Privacy Policy</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Terms of Service"
          onPress={() => openUrlSafe(TERMS_OF_SERVICE_URL, 'Terms of Service')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <DrawnMedallion size={28} accent={COLORS.purple}>
            <DocGlyph size={16} accent={COLORS.purple} />
          </DrawnMedallion>
          <Text style={[styles.settingLabel, { flex: 1 }]}>Terms of Service</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
        <Divider accent="purple" />
        <Pressable
          style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Contact Support"
          onPress={() =>
            openUrlSafe(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Wordfall Support')}`,
              'Contact Support',
            )
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <DrawnMedallion size={28} accent={COLORS.purple}>
            <EnvelopeGlyph size={16} accent={COLORS.purple} />
          </DrawnMedallion>
          <Text style={[styles.settingLabel, { flex: 1 }]}>Contact Support</Text>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>
      </Panel>

      {/* Danger Zone */}
      <SectionHeader label={t('settings.dangerZone').toUpperCase()} accent={COLORS.coral} />
      <View style={styles.dangerPanel}>
        <LinearGradient
          colors={['#2a1520', '#1e1218']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.dangerBody}>
          <PrimaryButton
            label={t('settings.resetLocalData')}
            onPress={confirmResetProgress}
            variant="danger"
            size="medium"
            fullWidth
            accessibilityLabel="Reset local data. Clears on-device progress only"
          />
          <Text style={styles.dangerSubtext}>
            Clears on-device progress only. Account and purchases are kept.
            Use "Delete Account" above for full erasure.
          </Text>
        </View>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  panelClip: {
    overflow: 'hidden',
  },
  // Halves bentoPanel's ambient accent glow — section cards should sit quiet
  // behind their content; the accent lives in the header tick + borders.
  panelGlowTrim: {
    shadowOpacity: 0.11,
    shadowRadius: 7,
    elevation: 3,
  },

  // Hero status strip
  heroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, '38'),
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: 'rgba(12,4,28,0.94)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 7,
    elevation: 3,
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 0.4,
    color: COLORS.textPrimary,
  },
  heroSub: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  heroBadges: {
    gap: 6,
    alignItems: 'flex-end',
  },
  heroPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  heroPillOn: {
    borderColor: withAlpha(COLORS.green, '59'),
    backgroundColor: withAlpha(COLORS.green, '1F'),
  },
  heroPillGold: {
    borderColor: withAlpha(COLORS.gold, '59'),
    backgroundColor: withAlpha(COLORS.gold, '1F'),
  },
  heroPillOff: {
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroPillText: {
    fontSize: 8,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  heroPillTextOn: {
    color: COLORS.green,
  },
  heroPillTextGold: {
    color: COLORS.goldLight,
  },
  // Hairline, inset past the icon well (14 pad + 28 well + 12 gap) so the
  // rules align with the label column — one divider rhythm for every section.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
    marginRight: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.2,
  },
  rowValueText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    flexShrink: 1,
  },

  // Volume control — single compact line per channel.
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  // Fixed label column so the three bars align vertically down the card.
  volumeLabelBlock: {
    width: 118,
    flexShrink: 0,
  },
  volumeControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volumeTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  volumeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
  volumeThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: COLORS.cyan,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    ...SHADOWS.soft,
  },
  volumePctChip: {
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  volumePctText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    fontVariant: ['tabular-nums'],
    color: COLORS.cyan,
    letterSpacing: 0.5,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBtnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.85,
  },
  stepBtnText: {
    fontSize: 14,
    lineHeight: 17,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  // Toggle — sized to sit level with the 24px steppers and 28px icon wells.
  toggle: {
    width: 46,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cellDefault,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  toggleOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.borderAccent,
    ...softGlow(COLORS.accent),
  },
  togglePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textSecondary,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.textPrimary,
    ...SHADOWS.soft,
  },

  // Selectable chips (colorblind / language / theme)
  panelIntro: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  panelIntroText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    flexShrink: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  chipSwatch: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  chipTextSelected: {
    color: COLORS.textPrimary,
  },
  chipCheck: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },

  // Action rows (account / about)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontFamily: FONTS.display,
  },
  panelFooter: {
    padding: 14,
  },

  // Purchases status
  statusBadge: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statusActive: {
    backgroundColor: withAlpha(COLORS.green, '25'),
    borderColor: withAlpha(COLORS.green, '40'),
    ...softGlow(COLORS.green),
  },
  statusInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.borderDisabled,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  statusTextActive: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  statusTextInactive: {
    color: COLORS.textMuted,
  },

  // Danger zone
  // Danger keeps its coral identity, but on a soft drop shadow — the glow
  // budget is reserved for the destructive PrimaryButton inside it.
  dangerPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.coral, '40'),
    overflow: 'hidden',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  dangerBody: {
    padding: 18,
    gap: 12,
  },
  dangerSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
  },
});

export default SettingsScreen;
