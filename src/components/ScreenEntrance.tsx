/**
 * ScreenEntrance — staggered content entrance for tab screens.
 *
 * The bottom tab navigator's `animation: 'shift'` is too fast to register,
 * so tab switches land as hard cuts with fully-formed pages (blind motion
 * review: 3.5/10). This wrapper gives each major content block a fade +
 * rise + settle entrance (opacity 0→1, translateY 18→0, scale 0.97→1)
 * staggered by `index`, mirroring ShopScreen's SectionEntrance — with one
 * critical difference: it RE-RUNS every time the screen regains tab focus
 * (via useFocusEffect), not just on first mount, so every tab switch gets
 * the cascade.
 *
 * Reduce-motion users get the children rendered directly — no wrapper
 * animation, no delay, no motion.
 */
import React, { useCallback, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface ScreenEntranceProps {
  /** Stagger slot — the entrance is delayed by 90 + index * 70 ms. */
  index: number;
  children: React.ReactNode;
  /** Optional layout style applied to the animated wrapper. */
  style?: StyleProp<ViewStyle>;
}

export function ScreenEntrance({ index, children, style }: ScreenEntranceProps) {
  const reduceMotion = useReduceMotion();
  // Start hidden so the first focused frame doesn't flash the settled state
  // before the entrance runs. Under reduce motion the wrapper isn't rendered
  // at all, so the initial value never shows.
  const anim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        anim.setValue(1);
        return;
      }
      anim.setValue(0);
      const entrance = Animated.sequence([
        Animated.delay(90 + index * 70),
        Animated.spring(anim, {
          toValue: 1,
          friction: 9,
          tension: 90,
          useNativeDriver: true,
        }),
      ]);
      entrance.start();
      return () => entrance.stop();
    }, [anim, index, reduceMotion]),
  );

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default ScreenEntrance;
