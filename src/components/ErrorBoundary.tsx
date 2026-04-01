/**
 * ErrorBoundary — Root error boundary for the app.
 * Catches uncaught JS errors in the component tree and shows a styled fallback UI.
 * Reports errors to crashReporter (Sentry when available).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { crashReporter } from '../services/crashReporting';
import { FONTS } from '../constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    crashReporter.captureException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  handleRestart = async () => {
    try {
      // Try expo-updates reload if available (production builds)
      const Updates = require('expo-updates');
      await Updates.reloadAsync();
    } catch {
      // expo-updates not available (dev/Expo Go) — reset error state to re-mount the tree
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={ebStyles.container}>
        <Text style={ebStyles.icon}>{'⚡'}</Text>
        <Text style={ebStyles.title}>Something went wrong</Text>
        <Text style={ebStyles.subtitle}>
          The app ran into an unexpected error. Restarting should fix things.
        </Text>

        {__DEV__ && this.state.error && (
          <View style={ebStyles.errorBox}>
            <Text style={ebStyles.errorText}>
              {this.state.error.message}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            ebStyles.button,
            pressed && ebStyles.buttonPressed,
          ]}
          onPress={this.handleRestart}
        >
          <Text style={ebStyles.buttonText}>Restart</Text>
        </Pressable>
      </View>
    );
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0015',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: '#f0e6ff',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 45, 149, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: '#b08cda',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 45, 149, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 149, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%' as any,
  },
  errorText: {
    fontFamily: FONTS.bodyRegular ?? 'Inter_400Regular',
    fontSize: 13,
    color: '#ff6eb8',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#ff2d95',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#ff2d95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  buttonText: {
    fontFamily: FONTS.display,
    color: '#f0e6ff',
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

export default ErrorBoundary;
