/**
 * LocalErrorBoundary — Scoped error boundary for subtrees.
 *
 * Use this around ceremonies, the purchase modal, the game field, or any
 * subtree where a render crash should not take down the whole app.
 *
 * Reports to Sentry/crashReporter with a `scope` tag so we can triage fixes
 * by area. Renders a compact fallback card and calls `onReset` so the parent
 * can dismiss or replace the broken subtree.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { crashReporter } from '../services/crashReporting';
import { COLORS, FONTS } from '../constants';

interface Props {
  /** Short label identifying the subtree (e.g. "ceremony", "purchase", "game_field"). */
  scope: string;
  /** Called when the user taps the reset button — parent should unmount or replace the subtree. */
  onReset?: () => void;
  /** Optional custom fallback. If omitted, a compact styled card is shown. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Friendly title shown in the default fallback. */
  title?: string;
  /** Button label shown in the default fallback. */
  actionLabel?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    crashReporter.captureException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      scope: this.props.scope,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback && this.state.error) {
      return this.props.fallback(this.state.error, this.handleReset);
    }

    const title = this.props.title ?? 'Something glitched';
    const actionLabel = this.props.actionLabel ?? 'Dismiss';

    return (
      <View style={styles.card}>
        <Text style={styles.icon}>{'\u26A1'}</Text>
        <Text style={styles.title}>{title}</Text>
        {__DEV__ && this.state.error && (
          <Text style={styles.error}>{this.state.error.message}</Text>
        )}
        <Pressable
          onPress={this.handleReset}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,45,149,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,149,0.35)',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  error: {
    fontFamily: FONTS.bodyRegular ?? 'Inter_400Regular',
    fontSize: 12,
    color: '#ff6eb8',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontFamily: FONTS.bodyBold,
    color: '#0a0015',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default LocalErrorBoundary;
