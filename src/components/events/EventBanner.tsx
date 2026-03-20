import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants';

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
      {/* Rich multi-layer gradient background */}
      <LinearGradient
        colors={['#0d1235', '#151a48', '#0d1235']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Purple accent layer */}
      <LinearGradient
        colors={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Cyan accent sweep on right */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 212, 255, 0.12)', 'rgba(0, 212, 255, 0.06)']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cyanSweep}
      />
      {/* Coral warm accent bottom-left */}
      <LinearGradient
        colors={['rgba(255, 107, 107, 0.1)', 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.coralAccent}
      />
      {/* Top edge highlight */}
      <View style={styles.topHighlight} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.liveRow}>
            <View style={styles.liveDotOuter}>
              <View style={styles.liveDot} />
            </View>
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
          <View style={styles.playCircleOuter}>
            <LinearGradient
              colors={['#00e5ff', '#00bbdd', '#0099cc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playCircle}
            >
              <Text style={styles.playArrow}>{'\u25B6'}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.playLabel}>PLAY</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    ...SHADOWS.strong,
    shadowColor: COLORS.purple,
    shadowOpacity: 0.3,
  },
  cyanSweep: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '65%',
    height: '100%',
    borderTopLeftRadius: 80,
    borderBottomLeftRadius: 40,
  },
  coralAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '45%',
    height: '55%',
    borderTopRightRadius: 60,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  liveDotOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.coral,
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: {
    color: COLORS.coral,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  eventName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  right: {
    alignItems: 'center',
  },
  playCircleOuter: {
    borderRadius: 28,
    ...SHADOWS.glow(COLORS.accent),
    shadowOpacity: 0.7,
    shadowRadius: 20,
    marginBottom: 6,
  },
  playCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
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
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
