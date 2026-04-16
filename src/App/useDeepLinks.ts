import { useEffect, MutableRefObject } from 'react';
import { Alert, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { parseDeepLink } from '../utils/deepLinking';
import { analytics } from '../services/analytics';

interface DeepLinksPlayer {
  loaded: boolean;
  applyReferralCode: (code: string) => boolean;
}

interface UseDeepLinksArgs {
  player: DeepLinksPlayer;
  navigationRef: MutableRefObject<NavigationContainerRef<any> | null>;
  pendingChallengeRef: MutableRefObject<string | null>;
}

export function useDeepLinks({ player, navigationRef, pendingChallengeRef }: UseDeepLinksArgs) {
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
            if (data.challengeId) {
              const cid = data.challengeId;
              const isValid =
                typeof cid === 'string' &&
                cid.length > 0 &&
                cid.length <= 64 &&
                /^[A-Za-z0-9_-]+$/.test(cid);
              if (!isValid) {
                Alert.alert('Invalid challenge link', 'That challenge link is malformed.');
                break;
              }
              pendingChallengeRef.current = cid;
              if (__DEV__) console.log('[DeepLink] Challenge received:', cid);
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
                (navigationRef.current as any)?.navigate('Home', {
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
        if (__DEV__) console.warn('[DeepLink] Failed to handle URL:', url);
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
