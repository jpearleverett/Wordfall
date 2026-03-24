/**
 * Crash Reporting Service
 * Captures uncaught errors and provides structured error reporting.
 * Ready for Sentry/Bugsnag integration — replace TODO sections.
 */

class CrashReporter {
  private static instance: CrashReporter;
  private userId: string | null = null;
  private initialized = false;
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

    const defaultHandler = (ErrorUtils as any).getGlobalHandler?.();
    (ErrorUtils as any).setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      this.captureException(error, { isFatal: isFatal ?? false });
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });

    this.initialized = true;

    if (__DEV__) {
      console.log('[CrashReporter] Initialized (dev mode)');
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    if (__DEV__) {
      console.error('[CrashReporter] Exception:', error.message, context);
    }
    // TODO: Sentry.captureException(error, { extra: context });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (__DEV__) {
      console.log(`[CrashReporter] [${level}]`, message);
    }
    // TODO: Sentry.captureMessage(message, level);
  }

  addBreadcrumb(message: string, category?: string): void {
    this.breadcrumbs.push({ message, timestamp: Date.now(), category });
    if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.MAX_BREADCRUMBS);
    }
  }

  setUser(userId: string): void {
    this.userId = userId;
  }

  clearUser(): void {
    this.userId = null;
  }
}

export const crashReporter = CrashReporter.getInstance();
