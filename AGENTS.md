# Wordfall — Agent Instructions

See `CLAUDE.md` for full architecture, commands, gotchas, and code patterns.

## Cursor Cloud specific instructions

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install --legacy-peer-deps` (`.npmrc` sets the flag by default, so `npm install` also works) |
| Type check | `npm run typecheck` |
| Tests | `npm test` (37 suites, 779 tests — all pure logic, no device needed) |
| Metro bundler | `npx expo start --dev-client` (add `--clear` if imports look stale) |

### Environment notes

- **Node 22** works fine; no `.nvmrc` or version pinning exists. Any Node >= 20 is expected to work.
- **No Docker, no database, no external services required.** Firebase, Sentry, AdMob, and IAP all have offline/mock fallbacks. The entire dev loop (install → typecheck → test → Metro) works without any secrets or credentials.
- **This is a React Native app — no web rendering.** Metro serves the JS bundle, but the app renders on a native dev client APK (not a browser). The `react-native-web` dependency exists for code sharing, but the web target has `import.meta` issues in the current config and is not the intended dev surface.
- **Metro bundler** successfully starts and bundles 1382 modules. It listens on port 8081 and generates a QR code / deep link for the dev client.
- **Tests are fully headless** — they mock `react-native` and `AsyncStorage` (see `src/__mocks__/`), so they run entirely in Node without any device or emulator.
- **`--legacy-peer-deps`** is required due to React 19 + RN 0.83 peer conflicts. The `.npmrc` file sets this automatically.
