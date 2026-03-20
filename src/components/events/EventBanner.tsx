import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  accent: '#00d4ff',
  accentGlow: 'rgba(0, 212, 255, 0.3)',
  purple: '#a855f7',
  coral: '#ff6b6b',
};

interface EventBannerProps {
  eventName: string;
  timeRemaining: string;
  description: string;
  onPress: () => void;
}

export default function EventBanner({
  eventName,
  timeRemaining,
  description,
  onPress,
}: EventBannerProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.wrapper}>
      {/* Layered gradient-style background */}
      <View style={styles.bgBase} />
      <View style={styles.bgLayer1} />
      <View style={styles.bgLayer2} />
      <View style={styles.bgLayer3} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE EVENT</Text>
          </View>
          <Text style={styles.eventName} numberOfLines={1}>
            {eventName}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          <View style={styles.timerRow}>
            <Text style={styles.timerIcon}>{'\u23F1'}</Text>
            <Text style={styles.timerText}>{timeRemaining}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <View style={styles.playCircle}>
            <Text style={styles.playArrow}>{'\u25B6'}</Text>
          </View>
          <Text style={styles.playLabel}>PLAY</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 120,
  },
  // Layered backgrounds to simulate a gradient effect
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d1235',
  },
  bgLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.purple,
    opacity: 0.15,
  },
  bgLayer2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60%',
    height: '100%',
    backgroundColor: COLORS.accent,
    opacity: 0.08,
    borderTopLeftRadius: 80,
    borderBottomLeftRadius: 40,
  },
  bgLayer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '40%',
    height: '50%',
    backgroundColor: COLORS.coral,
    opacity: 0.06,
    borderTopRightRadius: 60,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  left: {
    flex: 1,
    marginRight: 16,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.coral,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.coral,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  eventName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  timerText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  right: {
    alignItems: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 6,
  },
  playArrow: {
    color: '#000',
    fontSize: 18,
    marginLeft: 2,
  },
  playLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
