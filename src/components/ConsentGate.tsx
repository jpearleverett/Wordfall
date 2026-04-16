/**
 * ConsentGate — First-launch ToS + Privacy Policy acceptance gate.
 *
 * Blocks initial app use until the user taps "I Agree". Required by Play UGC
 * policy, Apple 1.2, GDPR, and the EU Digital Services Act for any app that
 * collects analytics / IDs / shows ads.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { recordTosAcceptance } from '../services/consent';

const PRIVACY_POLICY_URL = 'https://wordfall.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://wordfall.app/terms';

async function openUrlSafe(url: string, fallbackTitle: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through
  }
  Alert.alert(fallbackTitle, url);
}

interface Props {
  onAccept: () => void;
}

export function ConsentGate({ onAccept }: Props) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await recordTosAcceptance();
      onAccept();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0015', '#110028', '#0a0015'] as [string, string, string]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.emoji}>{'\u{1F4DC}'}</Text>
        <Text style={styles.title}>Welcome to Wordfall</Text>
        <Text style={styles.subtitle}>
          Before you start, please review how we handle your data and what
          rules apply while you play.
        </Text>

        <View style={styles.bulletCard}>
          <Text style={styles.bulletHeading}>What we collect</Text>
          <Text style={styles.bulletBody}>
            Anonymous game progress, crash diagnostics, and (on Android) your
            advertising ID for ad personalization. No email, phone, contacts,
            location, photos, or microphone.
          </Text>

          <Text style={styles.bulletHeading}>Club chat rules</Text>
          <Text style={styles.bulletBody}>
            Be kind. No harassment, hate speech, or spam. You can report or
            block other players in-game.
          </Text>

          <Text style={styles.bulletHeading}>Purchases</Text>
          <Text style={styles.bulletBody}>
            In-app purchases use your Google Play account. Mystery Wheel odds
            are published in-app and on our store page.
          </Text>
        </View>

        <View style={styles.linkRow}>
          <Pressable
            style={styles.linkButton}
            onPress={() => openUrlSafe(PRIVACY_POLICY_URL, 'Privacy Policy')}
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={styles.linkButton}
            onPress={() => openUrlSafe(TERMS_OF_SERVICE_URL, 'Terms of Service')}
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Service"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleAccept}
          disabled={busy}
          style={({ pressed }) => [
            styles.acceptButton,
            pressed && styles.acceptButtonPressed,
            busy && styles.acceptButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <LinearGradient
            colors={[...GRADIENTS.button.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.acceptInner, SHADOWS.glow(COLORS.accent)]}
          >
            <Text style={styles.acceptText}>
              {busy ? 'SAVING…' : 'I AGREE'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.footnote}>
          By tapping "I Agree" you confirm you have read our Terms of Service
          and Privacy Policy and are at least 13 years old.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.accent,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 340,
  },
  bulletCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
  },
  bulletHeading: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.accent,
    marginBottom: 6,
    marginTop: 12,
  },
  bulletBody: {
    fontFamily: FONTS.bodyRegular ?? 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 28,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
  acceptButton: {
    marginBottom: 16,
  },
  acceptButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptInner: {
    paddingHorizontal: 44,
    paddingVertical: 16,
    borderRadius: 14,
  },
  acceptText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    letterSpacing: 3,
    color: '#0a0015',
  },
  footnote: {
    fontFamily: FONTS.bodyRegular ?? 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});
