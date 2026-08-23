import type {
  StackCardInterpolationProps,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { COLORS } from '../constants';

type StackTransitionSpec = NonNullable<StackNavigationOptions['transitionSpec']>;

const cubicOut = (value: number): number => 1 - Math.pow(1 - value, 3);

const springOpenSpec: StackTransitionSpec['open'] = {
  animation: 'spring',
  config: {
    stiffness: 120,
    damping: 20,
    mass: 1,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

const timingCloseSpec: StackTransitionSpec['close'] = {
  animation: 'timing',
  config: {
    duration: 320,
    easing: cubicOut,
  },
};

function cardSpringFadeInterpolator({
  current,
  next,
  layouts,
}: StackCardInterpolationProps) {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width * 0.14, 0],
  });
  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const opacity = current.progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.6, 1],
  });
  const overlayOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.25],
      })
    : 0;

  return {
    cardStyle: {
      transform: [{ translateX }, { scale }],
      opacity,
    },
    overlayStyle: {
      opacity: overlayOpacity,
    },
  };
}

const commonStackOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.bg },
  freezeOnBlur: true,
};

const normalStackOptions: StackNavigationOptions = {
  ...commonStackOptions,
  cardStyleInterpolator: cardSpringFadeInterpolator,
  transitionSpec: {
    open: springOpenSpec,
    close: timingCloseSpec,
  },
};

const reducedStackOptions: StackNavigationOptions = {
  ...commonStackOptions,
  animation: 'none',
};

const sameGameFadeSpec: StackTransitionSpec = {
  open: {
    animation: 'timing',
    config: { duration: 180 },
  },
  close: {
    animation: 'timing',
    config: { duration: 180 },
  },
};

function fadeFromCenterInterpolator({
  current: { progress },
}: StackCardInterpolationProps) {
  return {
    cardStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 0.5, 0.9, 1],
        outputRange: [0, 0.25, 0.7, 1],
      }),
    },
    overlayStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
        extrapolate: 'clamp',
      }),
    },
  };
}

export function getStackMotionOptions(reduceMotion: boolean): StackNavigationOptions {
  return reduceMotion ? reducedStackOptions : normalStackOptions;
}

export function getTabAnimation(reduceMotion: boolean): 'none' | 'shift' {
  return reduceMotion ? 'none' : 'shift';
}

export function getGameRouteMotion(
  sameRoute: boolean,
  reduceMotion: boolean,
): StackNavigationOptions {
  if (!sameRoute) return {};
  if (reduceMotion) return { animation: 'none' };

  return {
    cardStyleInterpolator: fadeFromCenterInterpolator,
    transitionSpec: sameGameFadeSpec,
  };
}
