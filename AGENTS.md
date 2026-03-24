# Wordfall - Agent Instructions

See `CLAUDE.md` for full project context, architecture, and coding patterns.

## Cursor Cloud specific instructions

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install --legacy-peer-deps` |
| Type-check | `npx tsc --noEmit` |
| Run (web) | `npx expo start --web` |
| Run (mobile) | `npx expo start` |

### Development caveats

- **`--legacy-peer-deps` is required** for `npm install` due to React Navigation peer dependency conflicts. Without it, install fails with `ERESOLVE`.
- **No linter or test runner is configured** in `package.json`. The only static check available is TypeScript: `npx tsc --noEmit`.
- **Web mode requires extra dependencies** not in the committed `package.json`: `react-dom`, `react-native-web`, and `@expo/webpack-config`. Install them with `npm install --legacy-peer-deps react-dom@18.3.1 react-native-web@~0.19.0 @expo/webpack-config@~19.0.0` before running `npx expo start --web`.
- **Expo webpack serves on port 19006** (not 8081). When running `npx expo start --web`, the Metro bundler listens on 8081 but the browser app is at `http://localhost:19006`.
- **Firebase auth fails silently** — the app uses placeholder Firebase credentials and catches auth errors with `console.warn`. All features work without a real Firebase project.
- **react-native-reanimated warning is benign** — Webpack shows a "Module not found: react-native-reanimated" warning during compilation. This is caught in a try/catch inside react-native-gesture-handler and does not affect functionality.
- **Haptics and native audio do not work on web** — `expo-haptics` is a no-op on web; synthesized audio via `expo-av` works in the browser but may require user interaction to start (browser autoplay policy).
- **AsyncStorage is the only persistence layer** — there is no backend/database. All player progress is stored in the browser's localStorage (via AsyncStorage's web implementation).
