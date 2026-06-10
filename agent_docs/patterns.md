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

## Design system (June 2026)

- **Cards/panels:** compose `bentoPanel(accent, overrides?)` from `src/styles/bentoPanel.ts`. Never re-declare radius/padding/border/shadow for a card — the June 2026 audit found 10+ byte-identical duplicates.
- **Primary CTAs** (Buy / Claim / Join / Play-style actions): use `PrimaryButton` (`src/components/common/PrimaryButton.tsx`) — variants `primary | gold | green | danger`, sizes `small | medium | large`. Do not hand-roll gradient-pill buttons.
- **Hub-screen section bands:** use `SectionHeader` (`src/components/home/SectionHeader.tsx`) — accent tick + small-caps label + hairline rule. HomeScreen's bands: LIVE NOW (coral), YOUR JOURNEY (teal), TODAY'S GOALS (gold), MORE WAYS TO PLAY (purple). One ambient banner max on Home (milestone > welcome-back > early-guidance).
- **Scales:** new code resolves `fontSize` to a `TYPOGRAPHY` tier, margins/paddings to `SPACING`, and `borderRadius` to `RADIUS` (sm 4 badges/chips · md 8 inputs · lg 12 buttons · xl 16 cards · xxl 24 heroes · full pills). Disabled controls use `COLORS.buttonDisabled/textDisabled/borderDisabled`, not ad-hoc opacity.
- **Colors:** only `COLORS`/`GRADIENTS` tokens — no inline hexes. Wing/tier theming lives on tokens (`COLORS.tier*`, LibraryScreen `WING_META`).
- **Known debt (do not "fix" blind):** legacy screens still carry ~27 distinct font sizes / 34 radii; normalize opportunistically when touching a screen, with on-device review. Emoji-as-icon migration to a custom SVG set is a planned standalone project — don't partially migrate.
