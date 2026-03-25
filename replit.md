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

## Running the App

```bash
npm install
npx expo start --web --port 5000
```

The workflow "Start application" runs: `npx expo start --web --port 5000`

## Environment Variables

Firebase configuration (optional, required for auth and cloud features):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

## Deployment

Configured as a static site using `npx expo export --platform web` → `dist/` directory.
