# Wordfall Visual Harness

Standalone web-bundled preview for screenshot-grade visual checks on
individual components. Runs in headless Chromium via Puppeteer; no
device, emulator, or Metro required.

## Run

```bash
npm run screenshots
```

Builds `web-harness/harness.bundle.js` via esbuild, serves it on
`localhost:4488`, grabs one PNG per entry into
`.artifacts/screenshots/<id>.png`, then shuts down.

## Interactive mode

```bash
# Terminal 1 — watch & rebuild on edits
npm run harness:watch

# Terminal 2 — serve (any static server works)
npx serve web-harness -p 4488
# then open http://localhost:4488 in a browser
```

## Adding a new entry

Edit `web-harness/entries.tsx`. Each entry needs:

```tsx
{
  id: 'kebab-case-slug',          // becomes filename + URL param
  label: 'Human readable name',    // sidebar label
  render: () => (
    <MockProviders overrides={{ /* optional per-entry overrides */ }}>
      <YourComponent {...yourProps} />
    </MockProviders>
  ),
}
```

Only the `id` and `label` are scraped by the screenshot runner — the
render function runs in the browser.

## Known limits

- **Animations are snapshotted at their settled frame.** Reanimated is
  shimmed (see `shims/reanimated.tsx`) so `withTiming` / `withSpring` /
  `withSequence` return their target value immediately. Good for layout
  regression; can't verify mid-flight timing.
- **Native modules are shimmed.** `expo-haptics`, `expo-notifications`,
  `expo-audio`, `AsyncStorage`, and the Firebase-backed
  `src/services/firestore` all point at no-op shims in `shims/`.
- **Zustand-backed screens need seeding.** Components that subscribe
  directly to `useEconomyStore` / `usePlayerStore` won't render until
  you wrap them in a provider that seeds the store. For now the harness
  sticks to prop-driven components (modals, cards, ceremonies).
- **react-native-web layout quirks.** Positioning (especially
  `<Modal>` and percentage-based heights) doesn't always match native.
  Use the harness as a sanity check, not a pixel-perfect preview.

## Files

```
web-harness/
├── index.html               # static shell
├── harness.tsx              # React root + sidebar
├── entries.tsx              # the registry — edit me
├── mocks.tsx                # <MockProviders> + per-entry overrides
├── esbuild.config.mjs       # bundler config (alias + shim plugin)
├── shims/
│   ├── firestore.ts         # returns MockProviders overrides
│   ├── haptics.ts           # no-ops
│   ├── sound.ts             # no-ops
│   ├── useReduceMotion.ts   # always false
│   ├── reanimated.tsx       # settled-frame replacement
│   ├── expo-linear-gradient.tsx # CSS linear-gradient
│   ├── async-storage.ts     # in-memory
│   ├── empty-module.ts      # catch-all for non-essential deps
│   └── process-global.js    # injected process polyfill
└── harness.bundle.js        # (generated)
```

## Pairs well with

`scripts/take-screenshots.mjs` — the Puppeteer runner. Outputs at
`.artifacts/screenshots/<entry-id>.png`, 390×844 @ 2× device pixel
ratio (iPhone 14 Pro-ish).
