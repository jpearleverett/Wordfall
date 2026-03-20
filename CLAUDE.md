# Wordfall - AI Agent Context

## Product Snapshot

Wordfall is a gravity-based mobile word puzzle game built with **React Native + Expo + TypeScript**. Players select target words from a letter grid; when a word is cleared, the letters above collapse downward, changing the board and making **word order** the main strategic challenge.

The current app is no longer a prototype. It already includes:
- A full **5-tab navigation shell** with nested stacks.
- A playable **core puzzle game** with gravity, solver-backed hints, undo, and boosters.
- **10 game modes** defined in product/data/config and wired into mode selection.
- Persistent **player, economy, settings, and auth contexts**.
- A broad meta layer: chapters, library restoration, collections, cosmetics, missions, streaks, comeback rewards, and mode progression.
- A polished presentation layer with ambient backgrounds, hero illustrations, upgraded HUDs, and animated completion flows.
- A procedural **sound engine** that synthesizes SFX/music at runtime instead of shipping binary audio assets.

## Stack

- **Framework:** React Native 0.77.3
- **App runtime:** Expo ~54
- **Language:** TypeScript
- **Navigation:** React Navigation (bottom tabs + nested stacks)
- **Persistence:** AsyncStorage
- **Backend scaffold:** Firebase Auth + Firestore config hooks exist, but most gameplay currently runs locally/offline-first
- **Audio/Haptics:** expo-av + expo-haptics

## Working Commands

```bash
npm start
npm run android
npm run ios
npm run web
npx tsc --noEmit
```

### Important environment notes
- There is **no dedicated test script** in `package.json`.
- There is **no lint script** in `package.json`.
- `npx tsc --noEmit` may fail in a bare environment if Expo dependencies/types are not installed or resolved.
- This repo should be treated as an **Expo app first**, not a generic web TypeScript project.

## Repo Shape

```text
App.tsx                     App entry, navigation, wrapper logic, reward wiring
src/components/             Game UI and reusable UI primitives
src/components/common/      Design-system-level building blocks + ambient visuals
src/contexts/               Auth, economy, player, settings
src/data/                   Chapters, collections, cosmetics, events, missions
src/engine/                 Board generation, gravity, solver
src/hooks/                  useGame reducer + persistence helpers
src/screens/                Main product screens
src/services/               Sound, haptics, analytics
src/types.ts                Shared type definitions
src/constants.ts            Colors, configs, scoring, economy, animation constants
src/words.ts                Curated dictionary used by generation/solver
```

## Current Navigation Model

`App.tsx` owns navigation directly.

### Bottom tabs
- **Home**
- **Play**
- **Collections**
- **Library**
- **Profile**

### Nested stack destinations
- Home stack: Home, Shop, Settings, Game
- Play stack: Modes, Game, Event, Leaderboard
- Collections stack: Collections
- Library stack: Library
- Profile stack: Profile, Settings, Club
- Root flow also supports **Onboarding**

## Gameplay Model

### Core puzzle loop
1. Load a generated or seeded board.
2. Player taps or drags across **8-directionally adjacent** cells.
3. If the selected letters match an unfound target word, the word is accepted.
4. Cells are removed and gravity collapses columns.
5. The new board state may unlock new words or dead-end the puzzle depending on move order.
6. Score, combo, stars, rewards, and progression are awarded on completion.

### Selection rules
- Adjacency is **8-directional**, including diagonals.
- Words can follow **freeform adjacent paths**, not just straight lines.
- Re-tapping a selected cell trims the selection back to that point.
- Invalid submissions clear selection and can break perfect-run conditions.

### Boosters currently modeled in game state
- **Freeze Column**: prevents one column from collapsing for one move.
- **Board Preview**: shows a preview grid for the current selection result.
- **Shuffle Filler**: randomizes filler letters while preserving puzzle intent.

### Mode-specific rules already reflected in reducer/config flow
- `classic`
- `limitedMoves`
- `timePressure`
- `perfectSolve`
- `cascade`
- `daily`
- `weekly`
- `endless`
- `expert`
- `relax`

Not every mode has totally unique screen chrome, but the IDs, config wiring, unlock flow, and reward handling are part of the current product model and should be preserved.

## Current UX / Presentation Systems

The app has moved beyond minimal utility screens. Preserve the following direction when editing UI:

- **Dark fantasy/library presentation** with neon-accent puzzle feedback.
- Layered atmospheric visuals via `AmbientBackdrop`.
- Branded decorative illustration support via `HeroIllustrations`.
- Upgraded `GameHeader`, `PuzzleComplete`, `HomeScreen`, and `LibraryScreen` with richer cards, stat blocks, and animated reveals.
- `Grid` and `LetterCell` include visual polish such as glow states, movement highlighting, and stronger board readability.
- `GameScreen` includes mode intro messaging, idle hint prompting, score/chain celebration, and moved-cell feedback.

Avoid “simplifying” the UI back to plain lists/cards unless explicitly asked.

## Audio / Haptics

`src/services/sound.ts` is **not a placeholder anymore**.

It currently:
- Synthesizes short SFX tones and looping music progressions in code.
- Encodes generated PCM samples into WAV data URIs.
- Preloads SFX during initialization.
- Plays looped menu/gameplay/tense music via `expo-av`.
- Supports SFX volume, music volume, mute state, and track switching.

`src/services/haptics.ts` is used for interaction reinforcement. Settings control whether haptics should run.

When changing sound behavior, assume the procedural approach is intentional unless the task explicitly asks to restore asset-backed audio.

## Progression & Meta Systems

### Player progression
`PlayerContext` is the main durable source of player progression. It includes:
- Current/highest level
- Total score, puzzles solved, perfect solves
- Stars by level and total stars
- Chapter progression and restored library wings
- Daily completion + login tracking
- Streak data with grace/shield concepts
- Collections (atlas pages, rare tiles, stamps)
- Missions
- Cosmetic unlock/equip state
- Mode unlocks and mode stats
- Onboarding and feature unlock state
- Achievements and comeback rewards

### Economy
`EconomyContext` tracks persistent currencies such as:
- Coins
- Gems
- Hint tokens
- Event stars
- Library points

`App.tsx` wires puzzle completion into economy rewards, rare tile checks, atlas collection checks, mission progress, and mode unlocking.

### Library / collection fantasy
The meta-game is currently framed around restoring a grand library through chapter progress, earning collectibles, and unlocking cosmetics. That framing should stay consistent across new features and copy.

## Data / Content Inventory

The codebase already contains substantial static content:
- **40 chapters** across themed library wings
- **Collections** including atlas pages, rare tile sets, and seasonal albums
- **Cosmetics** for themes, frames, titles, and decorations
- **Events** calendar data
- **Mission** templates
- A curated **word list** used by puzzle generation/solver logic

When editing balancing or product copy, assume the content model is broad and progression-driven, not a tiny demo.

## Architecture Notes That Matter

### `App.tsx`
`App.tsx` is doing more than bootstrap. It currently owns:
- Navigation composition
- Mode/game wrappers
- Puzzle generation entry points
- Completion reward orchestration
- Settings application to sound/haptics
- Some onboarding and welcome-back flow wiring

Do not treat it as a trivial shell.

### `useGame`
`src/hooks/useGame.ts` is the core reducer-driven gameplay state container.
Key responsibilities include:
- Selection state
- Submission validation
- Score/combo/cascade rules
- Hint and undo counts
- Timer / move-limit behavior
- Dead-end detection support
- Booster state (`frozenColumns`, `previewGrid`, etc.)

Gameplay behavior changes usually belong here or in `src/engine/*`, not scattered through screens.

### Engine split
- `boardGenerator.ts`: build valid boards from dictionary/config
- `gravity.ts`: removal + collapse behavior
- `solver.ts`: word finding, solvability, hints, dead-end logic

If a requested change affects puzzle correctness, prefer updating engine/reducer logic over patching UI behavior.

## Safe Editing Guidelines for Future Agents

- Keep **game rules** in reducer/engine land when possible.
- Keep **persistent player/economy/settings state** in contexts, not local screen state.
- Preserve the **dark, premium, magical library** design language.
- Preserve the **gravity-first** identity of the game; do not drift into a generic word search.
- Preserve the **procedural audio** path unless explicitly directed otherwise.
- Prefer additive/refining changes over deleting major systems that are already wired.

## Known Gaps / Caveats

- Tooling is lighter than the feature scope suggests; expect some manual verification.
- Some backend/social/event systems are content-modeled more deeply than they are network-integrated.
- Firebase is scaffolded, but most day-to-day gameplay state is still local-first.
- Documentation should describe the **current game reality**, not aspirational systems that are not represented in code.
