import { useEffect, MutableRefObject } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { parseDeepLink } from '../utils/deepLinking';
import { analytics } from '../services/analytics';
import { logger } from '../utils/logger';

interface DeepLinksPlayer {
  loaded: boolean;
  applyReferralCode: (code: string) => boolean;
}

interface UseDeepLinksArgs {
  player: DeepLinksPlayer;
  navigationRef: MutableRefObject<NavigationContainerRef<any> | null>;
}

export function useDeepLinks({ player, navigationRef }: UseDeepLinksArgs) {
  useEffect(() => {
    if (!player.loaded) return;

    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      try {
        const data = parseDeepLink(url);
        switch (data.type) {
          case 'referral':
            if (data.referralCode) {
              const success = player.applyReferralCode(data.referralCode);
              if (success) {
                Alert.alert('Welcome!', 'Referral code applied! You received bonus rewards.');
              }
            }
            break;
          case 'challenge':
            // There is no challenge-accept flow yet: the id used to be
            // written to a ref that nothing read, which LOOKED like handling
            // and did nothing. Until an accept flow exists, take the player
            // somewhere sensible (the Play tab, where the challenge's mode
            // lives) instead of pretending. The analytics event below still
            // records demand for the feature.
            logger.log('[DeepLink] Challenge link opened (no accept flow yet):', data.challengeId);
            try {
              (navigationRef.current as any)?.navigate('Play');
            } catch {
              // Navigation may not be ready yet — silently ignore
            }
            break;
          case 'daily':
            try {
              (navigationRef.current as any)?.navigate('Play', {
                screen: 'Game',
                params: { mode: 'daily' },
              });
            } catch {
              // Navigation may not be ready yet — silently ignore
            }
            break;
          case 'club_invite':
            if (data.clubId) {
              const cidRaw = data.clubId;
              const isValid =
                typeof cidRaw === 'string' &&
                cidRaw.length > 0 &&
                cidRaw.length <= 64 &&
                /^[A-Za-z0-9_-]+$/.test(cidRaw);
              if (!isValid) {
                Alert.alert('Invalid club link', 'That club invite link is malformed.');
                break;
              }
              try {
                // Club is registered in the PROFILE stack; the old target
                // ('Home' > 'Club') does not exist, so every invite link
                // opened the app onto the home screen and dropped the
                // invite. ClubScreen reads joinClubId from route params.
                (navigationRef.current as any)?.navigate('Profile', {
                  screen: 'Club',
                  params: { joinClubId: cidRaw },
                });
              } catch {
                // Navigation not ready — fall through
              }
            }
            break;
          default:
            break;
        }
        if (data.type !== 'unknown') {
          void analytics.logEvent('deep_link_opened', { type: data.type, url });
        }
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
      subscription.remove();
    };
  }, [player.loaded]); // eslint-disable-line react-hooks/exhaustive-deps
}
