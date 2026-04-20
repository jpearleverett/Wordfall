import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { notificationManager } from '../services/notifications';
import { auth as firebaseAuth } from '../config/firebase';

type ThemeOption = 'dark' | 'midnight' | 'ocean' | 'forest' | 'sunset';

export type ColorblindMode =
  | 'off'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia';

interface Settings {
  sfxVolume: number;
  musicVolume: number;
  ceremonyVolume: number;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  theme: ThemeOption;
  adsRemoved: boolean;
  premiumPass: boolean;
  showTutorial: boolean;
  language: string;
  // Accessibility
  colorblindMode: ColorblindMode;
  // Privacy
  analyticsEnabled: boolean;
  personalizedAdsEnabled: boolean;
  // Parental controls
  spendingLimitEnabled: boolean;
  monthlySpendingLimit: number;
  requirePurchasePin: boolean;
  purchasePin: string;
  monthlySpent: number;
  monthlySpentResetDate: string;
}

interface SettingsContextType extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  loaded: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  ceremonyVolume: 0.8,
  hapticsEnabled: true,
  notificationsEnabled: true,
  theme: 'dark',
  adsRemoved: false,
  premiumPass: false,
  showTutorial: true,
  language: 'en',
  colorblindMode: 'off',
  // Privacy — default-on for non-EU; the consent flow (UMP) can flip
  // personalizedAdsEnabled off based on jurisdiction. Users can toggle both
  // from Settings at any time.
  analyticsEnabled: true,
  personalizedAdsEnabled: true,
  // Parental controls
  spendingLimitEnabled: false,
  monthlySpendingLimit: 25,
  requirePurchasePin: false,
  purchasePin: '',
  monthlySpent: 0,
  monthlySpentResetDate: '',
};

const STORAGE_KEY = '@wordfall_settings';

const SettingsContext = createContext<SettingsContextType>({
  ...DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<Settings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        logger.warn('Failed to load settings from AsyncStorage:', e);
      }
      setLoaded(true);
    };
    loadSettings();
  }, []);

  // Persist whenever settings change
  useEffect(() => {
    if (!loaded) return;

    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        logger.warn('Failed to save settings to AsyncStorage:', e);
      }
    };
    persist();
  }, [settings, loaded]);

  // Sync push-token presence in Firestore with the notifications toggle.
  // Transition true → false: delete the token so server senders stop targeting
  // this user. Transition false → true: re-register for remote push.
  // First render (prevNotif === null) is skipped so we don't delete a token
  // that's not there yet on a fresh install.
  const prevNotifRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const prev = prevNotifRef.current;
    prevNotifRef.current = settings.notificationsEnabled;
    if (prev === null) return; // skip initial

    const uid = firebaseAuth?.currentUser?.uid;
    if (!uid) return; // anonymous user with no Firestore token yet

    if (prev === true && settings.notificationsEnabled === false) {
      // Fire-and-forget; best-effort
      notificationManager.deletePushToken(uid).catch(() => {});
    } else if (prev === false && settings.notificationsEnabled === true) {
      notificationManager.registerForRemotePush(uid).catch(() => {});
    }
  }, [settings.notificationsEnabled, loaded]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      updateSetting,
      resetSettings,
      loaded,
    }),
    [settings, updateSetting, resetSettings, loaded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
