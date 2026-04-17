import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { analytics } from '../services/analytics';
import { crashReporter } from '../services/crashReporting';

interface UseShareVictoryArgs {
  level: number;
  mode: string;
  score: number;
}

/**
 * Capture a ShareCard ref and hand the PNG to the system share sheet.
 * Phase 4C of launch-readiness plan.
 *
 * Usage:
 *   const { ref, share, isSharing } = useShareVictory({ level, mode, score });
 *   <ShareCard ref={ref} ... />  // keep off-screen or hidden while capturing
 *   <Button onPress={share} />
 */
export function useShareVictory({ level, mode, score }: UseShareVictoryArgs) {
  const ref = useRef<View>(null);
  const inFlightRef = useRef(false);

  const share = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return false;
      if (!ref.current) return false;

      const uri = await captureRef(ref.current, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });

      void analytics.logEvent('share_tapped', {
        level,
        mode,
        score,
        surface: 'victory_card',
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Wordfall victory',
      });
      return true;
    } catch (error) {
      crashReporter.captureException(error as Error, {
        tags: { feature: 'share_victory_card' },
      });
      return false;
    } finally {
      inFlightRef.current = false;
    }
  }, [level, mode, score]);

  return { ref, share };
}
