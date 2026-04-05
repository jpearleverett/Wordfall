/**
 * Crash Reporting Service
 * Captures uncaught errors and provides structured error reporting.
 * Uses @sentry/react-native when available, falls back to console-only.
 */

import { logger } from '../utils/logger';

let Sentry: any = null;

// Attempt to load Sentry dynamically — mirrors the pattern used by ads service
try {
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not installed — will use console fallback
}

class CrashReporter {
  private static instance: CrashReporter;
  private userId: string | null = null;
  private initialized = false;
  private sentryAvailable = false;
  private breadcrumbs: { message: string; timestamp: number; category?: string }[] = [];
  private readonly MAX_BREADCRUMBS = 50;

  static getInstance(): CrashReporter {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize Sentry if available and DSN is configured
    if (Sentry) {
      const dsn = (process.env as any).EXPO_PUBLIC_SENTRY_DSN;
      if (dsn) {
        try {
          Sentry.init({
            dsn,
            debug: __DEV__,
            enableAutoSessionTracking: true,
            tracesSampleRate: __DEV__ ? 1.0 : 0.2,
          });
          this.sentryAvailable = true;
          if (__DEV__) {
            logger.log('[CrashReporter] Sentry initialized');
          }
        } catch (e) {
          if (__DEV__) {
            logger.warn('[CrashReporter] Sentry init failed:', e);
          }
        }
      } else if (__DEV__) {
        logger.log('[CrashReporter] Sentry SDK found but EXPO_PUBLIC_SENTRY_DSN not set — using console fallback');
      }
    }

    // Global error handler (runs regardless of Sentry availability)
    const defaultHandler = (ErrorUtils as any).getGlobalHandler?.();
    (ErrorUtils as any).setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      this.captureException(error, { isFatal: isFatal ?? false });
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });

    this.initialized = true;

    if (__DEV__ && !this.sentryAvailable) {
      logger.log('[CrashReporter] Initialized (console-only mode)');
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    if (__DEV__) {
      logger.error('[CrashReporter] Exception:', error.message, context);
    }

    if (this.sentryAvailable && Sentry) {
      Sentry.captureException(error, { extra: context });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (__DEV__) {
      console.log(`[CrashReporter] [${level}]`, message);
    }

    if (this.sentryAvailable && Sentry) {
      Sentry.captureMessage(message, level);
    }
  }

  addBreadcrumb(message: string, category?: string): void {
    // Local breadcrumb buffer
    this.breadcrumbs.push({ message, timestamp: Date.now(), category });
    if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.MAX_BREADCRUMBS);
    }

    // Forward to Sentry when available
    if (this.sentryAvailable && Sentry) {
      Sentry.addBreadcrumb({
        message,
        category: category ?? 'app',
        level: 'info',
        timestamp: Date.now() / 1000,
      });
    }
  }

  setUser(userId: string): void {
    this.userId = userId;
    if (this.sentryAvailable && Sentry) {
      Sentry.setUser({ id: userId });
    }
  }

  clearUser(): void {
    this.userId = null;
    if (this.sentryAvailable && Sentry) {
      Sentry.setUser(null);
    }
  }
}

export const crashReporter = CrashReporter.getInstance();
