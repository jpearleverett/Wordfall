# Wordfall

A gravity-based strategic word puzzle game built with React Native and Expo.

## Architecture

- **Framework:** React Native + Expo (~54.0.0)
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State:** React Context + useReducer
- **Storage:** AsyncStorage
- **Audio:** expo-av (procedurally generated tones)
- **Auth/Cloud:** Firebase (optional, requires env vars)

## Project Structure

```
App.tsx                     # Entry point, screen navigation
src/
  types.ts                  # TypeScript type definitions
  constants.ts              # Colors, dimensions, game config
  words.ts                  # Word database (~1500 words)
  engine/
    boardGenerator.ts       # Puzzle generation with solvability check
    gravity.ts              # Column-based gravity physics
    solver.ts               # Recursive backtracking solver
  hooks/
    useGame.ts              # Core game state (useReducer)
    useStorage.ts           # AsyncStorage persistence
  components/               # UI components
  screens/                  # App screens
  contexts/                 # React contexts (Auth, Economy, Player, Settings)
  services/                 # Sound, haptics, analytics, crash reporting
  data/                     # Collections, word packs
  utils/                    # Share generator, etc.
```

## Running in Replit (Web)

The workflow builds a static web bundle and serves it on port 5000:

```
Workflow: "Start application"
Command:  npx expo export --platform web --output-dir dist && npx serve dist -l 5000 --single
Port:     5000
```

**Important:** The Metro dev server (`expo start --web`) does not work with Replit's proxy. Instead, this project builds a static web export (`dist/`) and serves it via `serve`. Restarting the workflow will rebuild the static bundle.

## Web Dependencies Added for Replit

- `react-dom` — Required for Expo web
- `react-native-web` — React Native web renderer
- `@expo/metro-runtime` — Metro bundler web runtime
- `serve` — Static file server for the built output

## Deployment

Configured as a static site:
- **Build:** `npx expo export --platform web`
- **Output directory:** `dist/`

## Environment Variables

Firebase configuration (optional, required for auth and cloud features):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
