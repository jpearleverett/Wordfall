import type {
  StackCardInterpolationProps,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { COLORS } from '../constants';

type StackTransitionSpec = NonNullable<StackNavigationOptions['transitionSpec']>;

const cubicOut = (value: number): number => 1 - Math.pow(1 - value, 3);
export const TAB_INDICATOR_WIDTH = 20;

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

/**
 * Push transition: spring the card in from the right and fade it up.
 *
 * Deliberately NO scale. Scaling the card scales its CONTENT, and on a screen
 * whose content is a fixed-size board that is exactly what the player is
 * looking at, an entry from 0.94 reads as the puzzle loading at the wrong size
 * and then growing — not as motion. It is most obvious on a fast board
 * generation, where the grid paints while the spring is barely underway and
 * then visibly expands under it. Slide plus fade carries the same push without
 * resizing anything.
 */
function cardSpringFadeInterpolator({
  current,
  next,
  layouts,
}: StackCardInterpolationProps) {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width * 0.14, 0],
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
      transform: [{ translateX }],
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

export function getTabIndicatorPlan(
  tabWidth: number,
  activeIndex: number,
  reduceMotion: boolean,
): { target: number; animate: boolean } {
  return {
    target: tabWidth * activeIndex + tabWidth / 2 - TAB_INDICATOR_WIDTH / 2,
    animate: !reduceMotion,
  };
}

export function getTabVisibilityPlan(
  hidden: boolean,
  reduceMotion: boolean,
): {
  target: 0 | 1;
  duration: number;
  ensureMounted: boolean;
  unmountOnFinish: boolean;
  pointerEvents: 'none' | 'auto';
} {
  return {
    target: hidden ? 0 : 1,
    duration: reduceMotion ? 0 : hidden ? 140 : 180,
    ensureMounted: !hidden,
    unmountOnFinish: hidden,
    pointerEvents: hidden ? 'none' : 'auto',
  };
}

export function shouldUnmountTabBar(
  finished: boolean,
  requestedHidden: boolean,
  currentlyHidden: boolean,
): boolean {
  return finished && requestedHidden && currentlyHidden;
}

export function shouldResetGameRouteMarker(
  sameRouteTransition: boolean,
  closing: boolean,
): boolean {
  return sameRouteTransition && !closing;
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
