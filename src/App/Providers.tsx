import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { EconomyProvider } from '../contexts/EconomyContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { PlayerProvider } from '../contexts/PlayerContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <SettingsProvider>
              <EconomyProvider>
                <PlayerProvider>
                  {children}
                </PlayerProvider>
              </EconomyProvider>
            </SettingsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
