import { useEffect, MutableRefObject } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { parseDeepLink } from '../utils/deepLinking';
import {
  NAV_LINK_TYPES,
  createPendingLinkReplayer,
  resolveDeepLinkNav,
} from './deepLinkRouter';
import { analytics } from '../services/analytics';
import { logger } from '../utils/logger';

interface DeepLinksPlayer {
  loaded: boolean;
  applyReferralCode: (code: string) => boolean;
  /** Analytics-only free-mode tracking — parity with startDaily. */
  useEnergy?: (mode: string) => boolean;
}

interface UseDeepLinksArgs {
  player: DeepLinksPlayer;
  navigationRef: MutableRefObject<NavigationContainerRef<any> | null>;
}

/** How often to re-check whether a buffered link can be replayed. */
const REPLAY_POLL_MS = 500;

export function useDeepLinks({ player, navigationRef }: UseDeepLinksArgs) {
  useEffect(() => {
    if (!player.loaded) return;

    let replayTimer: ReturnType<typeof setInterval> | null = null;
    const stopReplayTimer = () => {
      if (replayTimer != null) {
        clearInterval(replayTimer);
        replayTimer = null;
      }
    };

    // The main tabs are the only place deep-link targets exist. On a
    // first-run cold start the NavigationContainer is unmounted behind the
    // ConsentGate (navigationRef.current === null), and during onboarding
    // the root stack renders ONLY the Onboarding screen — navigate() in
    // either state is silently dropped in production. Both count as "not
    // ready" so navigation links get buffered instead of lost.
    const isNavReadyForLinks = (): boolean => {
      const nav = navigationRef.current;
      if (!nav || !nav.isReady()) return false;
      try {
        const rootState = nav.getRootState();
        return rootState?.routes?.some((route) => route.name === 'MainTabs') === true;
      } catch {
        return false;
      }
    };

    // Resolve + navigate. Only called once isNavReadyForLinks() is true —
    // resolution happens at DELIVERY time, so a daily link buffered across
    // a UTC date boundary still generates today's board. The analytics
    // event is also logged here (not at receipt) so the funnel doesn't
    // record dropped links as successful opens.
    const deliverNavLink = (url: string) => {
      try {
        const data = parseDeepLink(url);
        if (data.type === 'challenge') {
          logger.log('[DeepLink] Challenge link opened (no accept flow yet):', data.challengeId);
        }
        let resolution;
        try {
          resolution = resolveDeepLinkNav(data);
        } catch {
          // Only the 'daily' case can throw (board generation) — mirror
          // startDaily's failure copy.
          if (data.type === 'daily') {
            Alert.alert('Error', 'Failed to generate daily puzzle.');
          }
          return;
        }
        switch (resolution.kind) {
          case 'invalid_club':
            Alert.alert('Invalid club link', 'That club invite link is malformed.');
            break;
          case 'navigate':
            if (data.type === 'daily') {
              // Daily is free (ENERGY.FREE_MODES) — analytics-only, same
              // call startDaily makes.
              player.useEnergy?.('daily');
            }
            try {
              (navigationRef.current as any)?.navigate(resolution.target, resolution.params);
            } catch {
              // Navigation raced into an unready state — drop rather than loop
            }
            break;
          default:
            break;
        }
        void analytics.logEvent('deep_link_opened', { type: data.type, url });
      } catch {
        logger.warn('[DeepLink] Failed to handle URL:', url);
      }
    };

    const replayer = createPendingLinkReplayer({
      isReady: isNavReadyForLinks,
      deliver: deliverNavLink,
    });

    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      try {
        const data = parseDeepLink(url);
        if (data.type === 'referral') {
          // Referral needs no navigation — apply immediately (works even
          // behind the consent gate / during onboarding).
          if (data.referralCode) {
            const success = player.applyReferralCode(data.referralCode);
            if (success) {
              Alert.alert('Welcome!', 'Referral code applied! You received bonus rewards.');
            }
          }
          void analytics.logEvent('deep_link_opened', { type: data.type, url });
          return;
        }
        if (NAV_LINK_TYPES.has(data.type)) {
          if (replayer.receive(url) === 'buffered' && replayTimer == null) {
            // Buffered behind consent/onboarding: poll until the main tabs
            // mount, then replay exactly once.
            replayTimer = setInterval(() => {
              if (replayer.flush() || replayer.peek() == null) stopReplayTimer();
            }, REPLAY_POLL_MS);
          }
          return;
        }
        // 'unknown' — ignore silently (no analytics), as before.
      } catch {
        logger.warn('[DeepLink] Failed to handle URL:', url);
      }
    };

    Linking.getInitialURL()
      .then(handleDeepLink)
      .catch(() => {
        // getInitialURL can fail on some platforms — ignore
      });

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      stopReplayTimer();
      subscription.remove();
    };
  }, [player.loaded]); // eslint-disable-line react-hooks/exhaustive-deps
}
