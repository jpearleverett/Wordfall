import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, cancelAnimation } from 'react-native-reanimated';

interface NeonStarBurstProps {
  active: boolean;
  color?: string;
  size?: number;
}

const LINE_COUNT = 8;
const LINE_WIDTH = 2;
const LINE_LENGTH = 30;
const BURST_DURATION = 300;
const PULSE_DURATION = 2000;

const NeonStarBurst: React.FC<NeonStarBurstProps> = ({
  active,
  color = '#ffb800',
  size = 60,
}) => {
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const hasBurst = useRef(false);

  useEffect(() => {
    if (active && !hasBurst.current) {
      hasBurst.current = true;

      burstScale.value = 0;
      burstOpacity.value = 1;

      burstScale.value = withTiming(1, { duration: BURST_DURATION });
      burstOpacity.value = withTiming(0, { duration: BURST_DURATION }, () => {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: PULSE_DURATION / 2 }),
            withTiming(1.0, { duration: PULSE_DURATION / 2 }),
          ),
          -1,
        );
      });
    }

    if (!active) {
      hasBurst.current = false;
      burstScale.value = 0;
      burstOpacity.value = 0;
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
    }
  }, [active]);

  const lines = React.useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < LINE_COUNT; i++) {
      result.push(i * (360 / LINE_COUNT));
    }
    return result;
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { width: size * 2, height: size * 2 },
        containerStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.burstContainer,
          { width: size * 2, height: size * 2 },
          burstStyle,
        ]}
      >
        {lines.map((angle) => (
          <View
            key={angle}
            style={[
              styles.line,
              {
                width: LINE_WIDTH,
                height: LINE_LENGTH,
                backgroundColor: color,
                transform: [
                  { translateY: -(size / 2 + LINE_LENGTH / 2) },
                  { rotate: `${angle}deg` },
                ],
                shadowColor: color,
                shadowOpacity: 0.8,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    alignSelf: 'center',
  },
  burstContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    borderRadius: 1,
  },
});

export default React.memo(NeonStarBurst);
