import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants';
import { sendGiftSecure, type GiftType } from '../../services/gifts';
import { analytics } from '../../services/analytics';
import { usePlayer } from '../../contexts/PlayerContext';
import { getTitleLabel } from '../../data/cosmetics';
import { logger } from '../../utils/logger';

/**
 * SendGiftButton — single tap target that opens a picker to send a hint
 * or tile to a friend/clubmate. Calls `sendGiftSecure` directly (bypassing
 * the legacy `PlayerSocialContext.sendHintGift` with its stale 1/day cap);
 * the server's unified 5/day cap is authoritative and surfaces via the
 * `resource-exhausted` HttpsError code.
 *
 * Gated by the caller — only render when the recipient is a friend or
 * clubmate (server will reject with `permission-denied` otherwise). Hides
 * when `recipientId` equals the current user.
 */

const LETTERS_FOR_TILE_GIFT = ['A', 'E', 'I', 'O', 'R', 'S', 'T'];

function randomCommonLetter(): string {
  return LETTERS_FOR_TILE_GIFT[Math.floor(Math.random() * LETTERS_FOR_TILE_GIFT.length)];
}

interface SendGiftButtonProps {
  recipientId: string;
  recipientName: string;
  /** For analytics attribution. `friend` and `clubmate` both pass the server's canSendPushTo gate. */
  relationship: 'friend' | 'clubmate';
  /** Tight-row variant (~24px); default is wider (~28px). */
  compact?: boolean;
}

export function SendGiftButton({
  recipientId,
  recipientName,
  relationship,
  compact = false,
}: SendGiftButtonProps) {
  const { equippedTitle } = usePlayer();
  const [sending, setSending] = useState(false);

  const send = async (type: GiftType) => {
    if (sending) return;
    setSending(true);
    try {
      const fromDisplayName = getTitleLabel(equippedTitle) || 'A friend';
      await sendGiftSecure({
        toUserId: recipientId,
        type,
        amount: 1,
        fromDisplayName,
      });
      void analytics.logEvent('gift_cta_sent', {
        gift_type: type,
        recipient_relationship: relationship,
      });
      Alert.alert('Gift sent!', `You sent a ${type === 'hint' ? 'hint' : 'tile'} to ${recipientName}.`);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? '';
      let reason: 'quota' | 'not_friend' | 'unknown' = 'unknown';
      let title = 'Oops';
      let message = 'Could not send gift. Try again later.';
      if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
        reason = 'quota';
        title = 'Daily limit reached';
        message = 'You can send up to 5 gifts per day.';
      } else if (
        code === 'functions/permission-denied' ||
        code === 'permission-denied'
      ) {
        reason = 'not_friend';
        title = 'Cannot send gift';
        message = 'You can only send gifts to friends and club members.';
      } else {
        logger.warn('[SendGiftButton] unexpected error:', err);
      }
      void analytics.logEvent('gift_cta_failed', { reason });
      Alert.alert(title, message);
    } finally {
      setSending(false);
    }
  };

  const handlePress = () => {
    if (sending) return;
    void analytics.logEvent('gift_cta_tapped', { recipient_relationship: relationship });
    Alert.alert(
      `Send gift to ${recipientName}`,
      'Which gift?',
      [
        {
          text: 'Send Hint',
          onPress: () => {
            void send('hint');
          },
        },
        {
          text: 'Send Tile',
          onPress: () => {
            void send('tile');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={sending}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Send gift to ${recipientName}`}
      accessibilityState={{ busy: sending }}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.normal,
        pressed && styles.pressed,
      ]}
    >
      {sending ? (
        <ActivityIndicator size="small" color={COLORS.gold} />
      ) : (
        <Text style={[styles.emoji, compact ? styles.emojiCompact : styles.emojiNormal]}>🎁</Text>
      )}
    </Pressable>
  );
}

// Use named wrapper to avoid `export {}` lint churn and to surface the
// component name in React DevTools.
export default SendGiftButton;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    width: 32,
    height: 32,
  },
  normal: {
    width: 40,
    height: 40,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  emoji: {
    textAlign: 'center',
  },
  emojiCompact: { fontSize: 18 },
  emojiNormal: { fontSize: 22 },
});
