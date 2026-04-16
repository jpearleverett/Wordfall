# Code Patterns

Conventions and rules-of-thumb for editing this codebase. Read this when
adding a new screen, component, game action, ceremony, or mode.

- Screens use **default exports**. Components use named exports.
- All types go in **`src/types.ts`**.
- Reanimated: `useSharedValue` + `useAnimatedStyle` + `withTiming`/`withSpring`/`withRepeat`/`withSequence`/`withDelay`. No `useNativeDriver` flag.
- When adding a **new ceremony**: add to `CeremonyItem['type']` in `types.ts`, queue via `player.queueCeremony()`, render in `App.tsx` ceremony switch. For simple ribbon+icon+text, reuse `MilestoneCeremony`.
- When adding a **new game action**: add to `GameAction` union in `types.ts`, handle in `gameReducer` in `useGame.ts`. The reducer is wrapped by zustand's `redux` middleware — no separate zustand action needed.
- **Game state lives in a zustand store**, not `useReducer`. `useGame()` creates the store and returns it + action dispatchers. Consumers read state via `useStore(store, selector)` or `useGameStore(selector)` (from context). **Never return full `state` from `useGame`** — that defeats the selector-based optimization. Add new selectors in `src/stores/gameStore.ts`.
- **`useStableCallback`** (from `src/utils/hooks.ts`) is the standard way to pass callbacks to memoized children. It gives a stable identity across renders while always calling the latest closure. Use it instead of `useCallback` when deps would churn.
- When adding a **new mode**: add to `MODE_CONFIGS` in `constants.ts`, wire reducer logic in `useGame.ts`, add mode-specific validation in `boardGenerator.ts`, add tutorial to `modeTutorials.ts`.
