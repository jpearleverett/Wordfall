import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeOption = 'dark' | 'midnight' | 'ocean' | 'forest' | 'sunset';

interface Settings {
  sfxVolume: number;
  musicVolume: number;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  theme: ThemeOption;
  adsRemoved: boolean;
  premiumPass: boolean;
  showTutorial: boolean;
  language: string;
}

interface SettingsContextType extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  loaded: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  hapticsEnabled: true,
  notificationsEnabled: true,
  theme: 'dark',
  adsRemoved: false,
  premiumPass: false,
  showTutorial: true,
  language: 'en',
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
        console.warn('Failed to load settings from AsyncStorage:', e);
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
        console.warn('Failed to save settings to AsyncStorage:', e);
      }
    };
    persist();
  }, [settings, loaded]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateSetting,
        resetSettings,
        loaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
