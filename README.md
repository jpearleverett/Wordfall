# Wordfall

A gravity-based strategic word puzzle game built with React Native and Expo.

## Setup (Termux + Expo Go)

```bash
# Install dependencies
npm install

# If you get version warnings, fix them with:
npx expo install --fix

# Start the dev server
npx expo start
```

Then scan the QR code with Expo Go on your phone.

## How to Play

1. Find target words hidden in the letter grid
2. Tap letters in sequence (horizontal or vertical) to spell a word
3. When you clear a word, those letters disappear and letters above **fall down**
4. The order you solve words matters — plan your moves carefully!
5. Clear all words to complete the puzzle

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
  components/
    Grid.tsx                # Letter grid with flex-end columns
    LetterCell.tsx           # Animated letter tile
    WordBank.tsx            # Target word display
    GameHeader.tsx          # Score, progress, action buttons
    PuzzleComplete.tsx      # Victory modal with stars
  screens/
    HomeScreen.tsx          # Main menu
    GameScreen.tsx          # Gameplay screen
```
