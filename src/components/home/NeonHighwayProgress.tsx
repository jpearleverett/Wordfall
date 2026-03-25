import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../../constants';

interface NeonHighwayProgressProps {
  currentLevel: number;
  highestLevel: number;
  starsPerLevel?: Record<number, number>;
  onLevelPress?: (level: number) => void;
}

const NODE_SIZE_CURRENT = 56;
const NODE_SIZE_ADJACENT = 44;
const NODE_SIZE_FAR = 36;
const LINE_WIDTH = 32;
const LINE_HEIGHT = 2;

type NodeStatus = 'completed' | 'current' | 'locked';

function getNodeStatus(level: number, currentLevel: number, highestLevel: number): NodeStatus {
  if (level < currentLevel || (level <= highestLevel && level !== currentLevel)) {
    return 'completed';
  }
  if (level === currentLevel) {
    return 'current';
  }
  return 'locked';
}

function getNodeSize(index: number): number {
  // index 0..4 maps to: far, adjacent, current, adjacent, far
  switch (index) {
    case 0: return NODE_SIZE_FAR;
    case 1: return NODE_SIZE_ADJACENT;
    case 2: return NODE_SIZE_CURRENT;
    case 3: return NODE_SIZE_ADJACENT;
    case 4: return NODE_SIZE_FAR;
    default: return NODE_SIZE_FAR;
  }
}

function StarDots({ earned, total }: { earned: number; total: number }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.starDot,
            i < earned ? styles.starDotFilled : styles.starDotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

const NeonHighwayProgress: React.FC<NeonHighwayProgressProps> = ({
  currentLevel,
  highestLevel,
  starsPerLevel = {},
  onLevelPress,
}) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const scaleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    const opacityAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.5,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    scaleAnim.start();
    opacityAnim.start();

    return () => {
      scaleAnim.stop();
      opacityAnim.stop();
    };
  }, [pulseScale, pulseOpacity]);

  // Build array of 5 levels centered on currentLevel
  const levels = Array.from({ length: 5 }, (_, i) => currentLevel - 2 + i);

  return (
    <View style={styles.container}>
      {levels.map((level, index) => {
        const status = getNodeStatus(level, currentLevel, highestLevel);
        const size = getNodeSize(index);
        const isInteractive = status === 'completed' || status === 'current';
        const stars = starsPerLevel[level] ?? 0;
        const showLine = index < levels.length - 1;

        return (
          <React.Fragment key={level}>
            <View style={styles.nodeWrapper}>
              {status === 'current' ? (
                <Animated.View
                  style={[
                    styles.glowRing,
                    {
                      width: size + 16,
                      height: size + 16,
                      borderRadius: (size + 16) / 2,
                      opacity: pulseOpacity,
                    },
                  ]}
                />
              ) : null}

              <Pressable
                disabled={!isInteractive}
                onPress={() => isInteractive && onLevelPress?.(level)}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed && isInteractive ? 0.92 : 1 }],
                  },
                ]}
              >
                {status === 'current' ? (
                  <Animated.View
                    style={[
                      styles.node,
                      styles.nodeCurrent,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        transform: [{ scale: pulseScale }],
                      },
                      SHADOWS.glow(COLORS.accent),
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelText,
                        styles.levelTextCurrent,
                        { fontSize: size * 0.36 },
                      ]}
                    >
                      {level}
                    </Text>
                  </Animated.View>
                ) : (
                  <View
                    style={[
                      styles.node,
                      status === 'completed' ? styles.nodeCompleted : styles.nodeLocked,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                      },
                      status === 'completed' ? SHADOWS.glow(COLORS.accent) : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelText,
                        status === 'completed'
                          ? styles.levelTextCompleted
                          : styles.levelTextLocked,
                        { fontSize: size * 0.36 },
                      ]}
                    >
                      {level > 0 ? level : ''}
                    </Text>
                  </View>
                )}
              </Pressable>

              {status === 'completed' && stars >= 0 ? (
                <StarDots earned={stars} total={3} />
              ) : (
                <View style={styles.starPlaceholder} />
              )}
            </View>

            {showLine ? (
              <View style={styles.lineContainer}>
                <View
                  style={[
                    styles.line,
                    {
                      width: LINE_WIDTH,
                      height: LINE_HEIGHT,
                    },
                    status === 'completed' || status === 'current'
                      ? styles.lineActive
                      : styles.lineLocked,
                    status === 'completed' || status === 'current'
                      ? SHADOWS.glow(COLORS.accent)
                      : undefined,
                  ]}
                />
              </View>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: COLORS.accentGlow,
    top: -(16 / 2),
    alignSelf: 'center',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nodeCompleted: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentLight,
  },
  nodeCurrent: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 3,
  },
  nodeLocked: {
    backgroundColor: 'transparent',
    borderColor: COLORS.textMuted,
    opacity: 0.4,
  },
  levelText: {
    fontFamily: FONTS.display,
    textAlign: 'center',
  },
  levelTextCompleted: {
    color: COLORS.textPrimary,
  },
  levelTextCurrent: {
    color: COLORS.accent,
  },
  levelTextLocked: {
    color: COLORS.textMuted,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 3,
  },
  starDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  starDotFilled: {
    backgroundColor: COLORS.gold,
  },
  starDotEmpty: {
    backgroundColor: COLORS.starEmpty,
  },
  starPlaceholder: {
    height: 12,
    marginTop: 6,
  },
  lineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // offset to align with node centers (above star row)
  },
  line: {
    borderRadius: 1,
  },
  lineActive: {
    backgroundColor: COLORS.accent,
  },
  lineLocked: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.3,
  },
});

export default React.memo(NeonHighwayProgress);
