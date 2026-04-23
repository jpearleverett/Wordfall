import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getRemoteBoolean } from '../services/remoteConfig';

/**
 * Hide the parent bottom tab bar while the current screen is focused, then
 * restore it on blur. Uses `navigation.getParent()` so the same hook works
 * whether GameScreen is mounted via HomeStack or PlayStack. Gated by the
 * `hideTabBarDuringPlayEnabled` Remote Config flag.
 */
export function useHideTabBarOnFocus() {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (!getRemoteBoolean('hideTabBarDuringPlayEnabled')) {
        return;
      }
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );
}
