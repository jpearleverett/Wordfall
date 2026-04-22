/**
 * Mock providers + shims for the visual harness.
 *
 * The harness imports real components from src/. Some of those components
 * read from contexts or call out to firestore / haptics / sound / native
 * modules that either (a) don't exist on web or (b) have unpredictable
 * data.  We install process-wide shims at import time via
 * ./shims-patch.ts (loaded by esbuild.config.mjs before entries.tsx).
 *
 * `MockProviders` is the React-level wrapper that lets individual entries
 * override per-entry state (e.g. the event leaderboard list).
 */
import React, { createContext, useContext } from 'react';

// ── Per-entry overrides ──────────────────────────────────────────────
// The harness is evaluated top-down: entries.tsx renders a tree rooted
// in <MockProviders>. Each entry can pass `overrides` to inject data.
// Any shim in shims-patch.ts reads from this context (when mounted)
// via `readOverride('mockEventLeaderboard')` below.

export interface HarnessOverrides {
  mockEventLeaderboard?: Array<{
    userId: string;
    displayName: string;
    score: number;
  }>;
}

let currentOverrides: HarnessOverrides = {};

export function readOverride<K extends keyof HarnessOverrides>(
  key: K,
): HarnessOverrides[K] | undefined {
  return currentOverrides[key];
}

const MockCtx = createContext<HarnessOverrides>({});

export function MockProviders(props: {
  children: React.ReactNode;
  overrides?: HarnessOverrides;
}): JSX.Element {
  // Set the module-scoped overrides synchronously on render so shims
  // (which don't go through React context) see the same values.
  currentOverrides = props.overrides ?? {};
  return (
    <MockCtx.Provider value={currentOverrides}>
      {props.children}
    </MockCtx.Provider>
  );
}

export function useHarnessOverrides(): HarnessOverrides {
  return useContext(MockCtx);
}
