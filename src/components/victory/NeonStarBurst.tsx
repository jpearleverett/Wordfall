import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface NeonStarBurstProps {
  /** Whether the burst animation should play */
  active: boolean;
  /** Color of the burst lines */
  color?: string;
  /** Size of the burst radius */
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
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const hasBurst = useRef(false);

  useEffect(() => {
    if (active && !hasBurst.current) {
      hasBurst.current = true;

      // Reset values
      burstScale.setValue(0);
      burstOpacity.setValue(1);

      // Burst: scale 0->1, opacity 1->0 over 300ms
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 1,
          duration: BURST_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: BURST_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After burst, start persistent gentle pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.04,
              duration: PULSE_DURATION / 2,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.0,
              duration: PULSE_DURATION / 2,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      });
    }

    if (!active) {
      hasBurst.current = false;
      burstScale.setValue(0);
      burstOpacity.setValue(0);
      pulseScale.setValue(1);
    }
  }, [active, burstScale, burstOpacity, pulseScale]);

  const lines = React.useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < LINE_COUNT; i++) {
      result.push(i * (360 / LINE_COUNT));
    }
    return result;
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          width: size * 2,
          height: size * 2,
          transform: [{ scale: pulseScale }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.burstContainer,
          {
            width: size * 2,
            height: size * 2,
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          },
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
